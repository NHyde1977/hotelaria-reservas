
import { ConflictException } from '@nestjs/common';
import { ReservasDisponibilidadeService } from './reservas-disponibilidade.service';
import { PrismaService } from '../prisma/prisma.service';
import { reserva_status } from '@prisma/client';

describe('ReservasDisponibilidadeService', () => {
  let service: ReservasDisponibilidadeService;
  let findFirst: jest.Mock;

  const quartoId = BigInt(101);
  const checkin = '2026-11-10';
  const checkout = '2026-11-15';

  beforeEach(() => {
    findFirst = jest.fn();

    const prismaMock = {
      reserva: {
        findFirst,
      },
    } as unknown as PrismaService;

    service = new ReservasDisponibilidadeService(prismaMock);
  });

  it('deve permitir reserva quando não existe conflito', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      service.verificarDisponibilidade(quartoId, checkin, checkout),
    ).resolves.toBeUndefined();
  });

  it('deve rejeitar reserva quando existe conflito', async () => {
    findFirst.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
    });

    await expect(
      service.verificarDisponibilidade(quartoId, checkin, checkout),
    ).rejects.toThrow(ConflictException);
  });

  it('deve consultar somente o quarto solicitado', async () => {
    findFirst.mockResolvedValue(null);

    await service.verificarDisponibilidade(quartoId, checkin, checkout);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          quarto_id: BigInt(101),
        }),
      }),
    );
  });

  it('deve aplicar a condição correta de sobreposição', async () => {
    findFirst.mockResolvedValue(null);

    await service.verificarDisponibilidade(quartoId, checkin, checkout);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          data_previsao_checkin: {
            lt: new Date('2026-11-15T00:00:00Z'),
          },
          data_previsao_checkout: {
            gt: new Date('2026-11-10T00:00:00Z'),
          },
        }),
      }),
    );
  });

  it('deve considerar somente os status que bloqueiam disponibilidade', async () => {
    findFirst.mockResolvedValue(null);

    await service.verificarDisponibilidade(quartoId, checkin, checkout);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [
              reserva_status.PENDENTE_PAGAMENTO,
              reserva_status.CONFIRMADA,
              reserva_status.EM_HOSPEDAGEM,
              reserva_status.CHECKOUT_REALIZADO,
            ],
          },
        }),
      }),
    );
  });

  it('deve excluir a própria reserva ao verificar uma alteração', async () => {
    findFirst.mockResolvedValue(null);

    const reservaId = '550e8400-e29b-41d4-a716-446655440000';

    await service.verificarDisponibilidade(
      quartoId,
      checkin,
      checkout,
      reservaId,
    );

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: reservaId },
        }),
      }),
    );
  });

  it('não deve excluir nenhuma reserva quando não há ID informado', async () => {
    findFirst.mockResolvedValue(null);

    await service.verificarDisponibilidade(quartoId, checkin, checkout);

    const argumentos = findFirst.mock.calls[0][0];

    expect(argumentos.where.id).toBeUndefined();
  });
});
