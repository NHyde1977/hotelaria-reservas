
import { PrismaClient } from '@prisma/client';

describe('Reservas - integração com MySQL', () => {
  let prisma: PrismaClient;

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
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('deve conectar ao banco local e encontrar as tabelas vazias', async () => {
    const totalReservas = await prisma.reserva.count();
    const totalHospedes = await prisma.hospede_reserva.count();
    const totalLogs = await prisma.log_auditoria.count();

    expect(totalReservas).toBe(0);
    expect(totalHospedes).toBe(0);
    expect(totalLogs).toBe(0);
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

});
