import {
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, reserva_status } from '@prisma/client';
import { ReservasService } from './reservas.service';
import { ReservasCalculoService } from './reservas-calculo.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservasDisponibilidadeService } from './reservas-disponibilidade.service';
import { CriarReservaDto } from './dto/criar-reserva.dto';
import { TipoHospede } from './dto/criar-hospede.dto';
import { Quarto } from '../integracoes/quartos/quarto.interface';

describe('ReservasService - persistência transacional', () => {
  const dto: CriarReservaDto = {
    quartoId: 10,
    dataPrevisaoCheckin: '2026-12-10',
    dataPrevisaoCheckout: '2026-12-13',
    hospedes: [
      {
        usuarioId: '550e8400-e29b-41d4-a716-446655440000',
        tipo: TipoHospede.TITULAR,
        autorizadoCheckin: true,
      },
    ],
  };

  const quarto: Quarto = {
    id: 10,
    status: 'ATIVO',
    disponibilidade: 'DISPONIVEL',
    tipo: {
      nome: 'Individual',
      capacidadeMaxima: 1,
      precoDiaria: '350.00',
    },
  };

  it('deve verificar disponibilidade e criar reserva na mesma transação', async () => {
    const ordem: string[] = [];

    const reservaCriada = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      status: reserva_status.PENDENTE_PAGAMENTO,
    };

    const tx = {
      reserva: {
        create: jest.fn().mockImplementation(async () => {
          ordem.push('criar');
          return reservaCriada;
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation(
        async (
          callback: (cliente: typeof tx) => Promise<unknown>,
        ) => callback(tx),
      ),
    };

    const disponibilidade = {
      verificarDisponibilidade: jest.fn().mockImplementation(async () => {
        ordem.push('verificar');
      }),
    };

    const service = new ReservasService(
      prisma as unknown as PrismaService,
      {} as ConstructorParameters<typeof ReservasService>[1],
      {} as ConstructorParameters<typeof ReservasService>[2],
      {} as ConstructorParameters<typeof ReservasService>[3],
      {} as ConstructorParameters<typeof ReservasService>[4],
      {} as ConstructorParameters<typeof ReservasService>[5],
      disponibilidade as unknown as ReservasDisponibilidadeService,
      new ReservasCalculoService(),
    );

    const resultado = await service.persistirReservaValidada(dto, quarto);

    expect(resultado).toEqual(reservaCriada);

    expect(ordem).toEqual(['verificar', 'criar']);

    expect(disponibilidade.verificarDisponibilidade).toHaveBeenCalledWith(
      10n,
      '2026-12-10',
      '2026-12-13',
      undefined,
      tx,
    );

    expect(tx.reserva.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quarto_id: 10n,
        status: reserva_status.PENDENTE_PAGAMENTO,
      }),
      include: {
        hospede_reserva: true,
      },
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }),
    );
  });


it('não deve criar reserva quando houver conflito de disponibilidade', async () => {
  const tx = {
    reserva: {
      create: jest.fn(),
    },
  };

  const prisma = {
    $transaction: jest.fn().mockImplementation(
      async (
        callback: (cliente: typeof tx) => Promise<unknown>,
      ) => callback(tx),
    ),
  };

  const disponibilidade = {
    verificarDisponibilidade: jest.fn().mockRejectedValue(
      new ConflictException(
        'O quarto já possui uma reserva para o período solicitado.',
      ),
    ),
  };

  const service = new ReservasService(
    prisma as unknown as PrismaService,
    {} as ConstructorParameters<typeof ReservasService>[1],
    {} as ConstructorParameters<typeof ReservasService>[2],
    {} as ConstructorParameters<typeof ReservasService>[3],
    {} as ConstructorParameters<typeof ReservasService>[4],
    {} as ConstructorParameters<typeof ReservasService>[5],
    disponibilidade as unknown as ReservasDisponibilidadeService,
    new ReservasCalculoService(),
  );

  await expect(
    service.persistirReservaValidada(dto, quarto),
  ).rejects.toThrow(ConflictException);

  expect(disponibilidade.verificarDisponibilidade).toHaveBeenCalledWith(
    10n,
    '2026-12-10',
    '2026-12-13',
    undefined,
    tx,
  );

  expect(tx.reserva.create).not.toHaveBeenCalled();
});


it('deve repetir a transação quando ocorrer erro P2034', async () => {
  const reservaCriada = {
    id: '550e8400-e29b-41d4-a716-446655440099',
    status: reserva_status.PENDENTE_PAGAMENTO,
  };

  const tx = {
    reserva: {
      create: jest.fn().mockResolvedValue(reservaCriada),
    },
  };

  const erroConcorrencia = new Prisma.PrismaClientKnownRequestError(
    'Conflito transacional.',
    {
      code: 'P2034',
      clientVersion: '6.19.0',
    },
  );

  const prisma = {
    $transaction: jest.fn()
      .mockRejectedValueOnce(erroConcorrencia)
      .mockImplementation(
        async (callback: (cliente: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
  };

  const disponibilidade = {
    verificarDisponibilidade: jest.fn().mockResolvedValue(undefined),
  };

  const service = new ReservasService(
    prisma as unknown as PrismaService,
    {} as ConstructorParameters<typeof ReservasService>[1],
    {} as ConstructorParameters<typeof ReservasService>[2],
    {} as ConstructorParameters<typeof ReservasService>[3],
    {} as ConstructorParameters<typeof ReservasService>[4],
    {} as ConstructorParameters<typeof ReservasService>[5],
    disponibilidade as unknown as ReservasDisponibilidadeService,
    new ReservasCalculoService(),
  );

  const resultado = await service.persistirReservaValidada(dto, quarto);

  expect(resultado).toEqual(reservaCriada);
  expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  expect(disponibilidade.verificarDisponibilidade).toHaveBeenCalledTimes(1);
  expect(tx.reserva.create).toHaveBeenCalledTimes(1);
});


it('deve interromper após três tentativas com erro P2034', async () => {
  const erroConcorrencia = new Prisma.PrismaClientKnownRequestError(
    'Conflito transacional persistente.',
    {
      code: 'P2034',
      clientVersion: '6.19.0',
    },
  );

  const prisma = {
    $transaction: jest.fn().mockRejectedValue(erroConcorrencia),
  };

  const disponibilidade = {
    verificarDisponibilidade: jest.fn(),
  };

  const service = new ReservasService(
    prisma as unknown as PrismaService,
    {} as ConstructorParameters<typeof ReservasService>[1],
    {} as ConstructorParameters<typeof ReservasService>[2],
    {} as ConstructorParameters<typeof ReservasService>[3],
    {} as ConstructorParameters<typeof ReservasService>[4],
    {} as ConstructorParameters<typeof ReservasService>[5],
    disponibilidade as unknown as ReservasDisponibilidadeService,
    new ReservasCalculoService(),
  );

  await expect(
  service.persistirReservaValidada(dto, quarto),
).rejects.toThrow(ServiceUnavailableException);

  expect(prisma.$transaction).toHaveBeenCalledTimes(3);
});

it('não deve repetir a transação para erros diferentes de P2034', async () => {
  const erroBanco = new Error('Falha de conexão com o banco.');

  const prisma = {
    $transaction: jest.fn().mockRejectedValue(erroBanco),
  };

  const disponibilidade = {
    verificarDisponibilidade: jest.fn(),
  };

  const service = new ReservasService(
    prisma as unknown as PrismaService,
    {} as ConstructorParameters<typeof ReservasService>[1],
    {} as ConstructorParameters<typeof ReservasService>[2],
    {} as ConstructorParameters<typeof ReservasService>[3],
    {} as ConstructorParameters<typeof ReservasService>[4],
    {} as ConstructorParameters<typeof ReservasService>[5],
    disponibilidade as unknown as ReservasDisponibilidadeService,
    new ReservasCalculoService(),
  );

  await expect(
    service.persistirReservaValidada(dto, quarto),
  ).rejects.toBe(erroBanco);

  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
});

});
