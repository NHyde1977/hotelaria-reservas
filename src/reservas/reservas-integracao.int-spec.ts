import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CriarReservaDto } from './dto/criar-reserva.dto';
import { Quarto } from '../integracoes/quartos/quarto.interface';
import { TipoHospede } from './dto/criar-hospede.dto';
import { PrismaClient } from '@prisma/client';
import { ReservasService } from './reservas.service';
import { ReservasDisponibilidadeService } from './reservas-disponibilidade.service';
import { ReservasCalculoService } from './reservas-calculo.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Reservas - integração com MySQL', () => {
  let prisma: PrismaClient;
  let reservasService: ReservasService;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;

    if (
      !databaseUrl ||
      !databaseUrl.startsWith('mysql://') ||
      !databaseUrl.includes('@127.0.0.1:3307/') ||
      !databaseUrl.endsWith('/hotelaria_reservas_test')
    ) {
      throw new Error(
        'Teste bloqueado: DATABASE_URL não aponta para o MySQL local de testes.',
      );
    }

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    await prisma.$connect();

    const prismaService = prisma as PrismaService;

    const disponibilidade = new ReservasDisponibilidadeService(prismaService);

    const calculo = new ReservasCalculoService();

    reservasService = new ReservasService(
      prismaService,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      disponibilidade,
      calculo,
    );
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('deve conectar ao MySQL local e consultar as tabelas', async () => {
    const totalReservas = await prisma.reserva.count();
    const totalHospedes = await prisma.hospede_reserva.count();
    const totalLogs = await prisma.log_auditoria.count();

    expect(totalReservas).toBeGreaterThanOrEqual(0);
    expect(totalHospedes).toBeGreaterThanOrEqual(0);
    expect(totalLogs).toBeGreaterThanOrEqual(0);
  });

  it('deve desfazer a criação da reserva e do hóspede após rollback', async () => {
    const reservaId = '550e8400-e29b-41d4-a716-446655440101';
    const hospedeId = '550e8400-e29b-41d4-a716-446655440102';

    const erroRollback = new Error('ROLLBACK_INTENCIONAL');

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.reserva.create({
          data: {
            id: reservaId,
            quarto_id: 10n,
            data_previsao_checkin: new Date('2026-12-10T00:00:00Z'),
            data_previsao_checkout: new Date('2026-12-13T00:00:00Z'),
            valor_diaria_contratada: '350.00',
            valor_total_contratado: '1050.00',
            hospede_reserva: {
              create: {
                id: hospedeId,
                usuario_id: '550e8400-e29b-41d4-a716-446655440000',
                tipo: 'TITULAR',
                autorizado_checkin: true,
              },
            },
          },
        });

        const reservaNaTransacao = await tx.reserva.findUnique({
          where: { id: reservaId },
          include: { hospede_reserva: true },
        });

        expect(reservaNaTransacao).not.toBeNull();
        expect(reservaNaTransacao?.hospede_reserva).toHaveLength(1);

        throw erroRollback;
      }),
    ).rejects.toBe(erroRollback);

    const reservaPersistida = await prisma.reserva.findUnique({
      where: { id: reservaId },
    });

    const hospedePersistido = await prisma.hospede_reserva.findUnique({
      where: { id: hospedeId },
    });

    expect(reservaPersistida).toBeNull();
    expect(hospedePersistido).toBeNull();
  });

  it('deve preparar duas solicitações concorrentes para o mesmo quarto', () => {
    const usuarioA = randomUUID();
    const usuarioB = randomUUID();

    const quarto: Quarto = {
      id: 999001,
      status: 'ATIVO',
      disponibilidade: 'DISPONIVEL',
      tipo: {
        nome: 'Duplo',
        capacidadeMaxima: 2,
        precoDiaria: '350.00',
      },
    };

    const dtoA: CriarReservaDto = {
      quartoId: quarto.id,
      dataPrevisaoCheckin: '2026-12-10',
      dataPrevisaoCheckout: '2026-12-13',
      hospedes: [
        {
          usuarioId: usuarioA,
          tipo: TipoHospede.TITULAR,
          autorizadoCheckin: true,
        },
      ],
    };

    const dtoB: CriarReservaDto = {
      ...dtoA,
      hospedes: [
        {
          usuarioId: usuarioB,
          tipo: TipoHospede.TITULAR,
          autorizadoCheckin: true,
        },
      ],
    };

    expect(dtoA.quartoId).toBe(dtoB.quartoId);
    expect(dtoA.dataPrevisaoCheckin).toBe(dtoB.dataPrevisaoCheckin);
    expect(dtoA.dataPrevisaoCheckout).toBe(dtoB.dataPrevisaoCheckout);

    expect(dtoA.hospedes[0].usuarioId).not.toBe(dtoB.hospedes[0].usuarioId);

    expect(quarto.tipo.precoDiaria).toBe('350.00');
  });

  it('não deve persistir duas reservas concorrentes para o mesmo quarto e período', async () => {
    const quartoId = 999001;
    const checkin = '2026-12-10';
    const checkout = '2026-12-13';

    const quarto: Quarto = {
      id: quartoId,
      status: 'ATIVO',
      disponibilidade: 'DISPONIVEL',
      tipo: {
        nome: 'Duplo',
        capacidadeMaxima: 2,
        precoDiaria: '350.00',
      },
    };

    const criarDto = (): CriarReservaDto => ({
      quartoId,
      dataPrevisaoCheckin: checkin,
      dataPrevisaoCheckout: checkout,
      hospedes: [
        {
          usuarioId: randomUUID(),
          tipo: TipoHospede.TITULAR,
          autorizadoCheckin: true,
        },
      ],
    });

    const dtoA = criarDto();
    const dtoB = criarDto();

    const idsCriados: string[] = [];

    try {
      const resultados = await Promise.allSettled([
        reservasService.persistirReservaValidada(dtoA, quarto),
        reservasService.persistirReservaValidada(dtoB, quarto),
      ]);

      const sucessos = resultados.filter(
        (resultado) => resultado.status === 'fulfilled',
      );

      const falhas = resultados.filter(
        (resultado) => resultado.status === 'rejected',
      );

      const falha = falhas[0];

      expect(falha.status).toBe('rejected');

      if (falha.status === 'rejected') {
        expect(
          falha.reason instanceof ConflictException ||
            falha.reason instanceof ServiceUnavailableException,
        ).toBe(true);
      }

      for (const resultado of sucessos) {
        if (resultado.status === 'fulfilled') {
          idsCriados.push(resultado.value.id);
        }
      }

      const reservasPersistidas = await prisma.reserva.findMany({
        where: {
          quarto_id: BigInt(quartoId),
          data_previsao_checkin: new Date(`${checkin}T00:00:00Z`),
          data_previsao_checkout: new Date(`${checkout}T00:00:00Z`),
        },
        include: {
          hospede_reserva: true,
        },
      });

      expect(sucessos).toHaveLength(1);
      expect(falhas).toHaveLength(1);
      expect(reservasPersistidas).toHaveLength(1);
      expect(reservasPersistidas[0].hospede_reserva).toHaveLength(1);
    } finally {
      if (idsCriados.length > 0) {
        await prisma.hospede_reserva.deleteMany({
          where: {
            reserva_id: { in: idsCriados },
          },
        });

        await prisma.reserva.deleteMany({
          where: {
            id: { in: idsCriados },
          },
        });
      }
    }
  });
});
