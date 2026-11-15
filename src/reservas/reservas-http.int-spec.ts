
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { UsuariosClientService } from '../integracoes/usuarios/usuarios-client.service';
import { QuartosClientService } from '../integracoes/quartos/quartos-client.service';

describe('Reservas - criação por HTTP', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let reservaId: string | undefined;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;

    if (
      !databaseUrl ||
      !databaseUrl.startsWith('mysql://') ||
      !databaseUrl.includes('@127.0.0.1:3307/') ||
      !databaseUrl.endsWith('/hotelaria_reservas_test')
    ) {
      throw new Error(
        'Teste bloqueado: DATABASE_URL não aponta para o MySQL local.',
      );
    }

    prisma = new PrismaClient({
      datasources: {
        db: { url: databaseUrl },
      },
    });

    await prisma.$connect();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(UsuariosClientService)
      .useValue({
        buscarPorId: jest.fn().mockResolvedValue({
          id: '550e8400-e29b-41d4-a716-446655440000',
          nome: 'Usuário de Teste',
          dataNascimento: '1990-01-01',
          status: 'ATIVO',
          roles: ['USER'],
        }),
      })
      .overrideProvider(QuartosClientService)
      .useValue({
        buscarPorId: jest.fn().mockResolvedValue({
          id: 10,
          status: 'ATIVO',
          disponibilidade: 'DISPONIVEL',
          tipo: {
            nome: 'Individual',
            capacidadeMaxima: 1,
            precoDiaria: '350.00',
          },
        }),
      })
      .compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (reservaId && prisma) {
      await prisma.hospede_reserva.deleteMany({
        where: { reserva_id: reservaId },
      });

      await prisma.reserva.delete({
        where: { id: reservaId },
      });
    }

    if (app) {
      await app.close();
    }

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('deve criar uma reserva e retornar HTTP 201', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/reservas')
      .send({
        quartoId: 10,
        dataPrevisaoCheckin: '2026-12-10',
        dataPrevisaoCheckout: '2026-12-13',
        hospedes: [
          {
            usuarioId: '550e8400-e29b-41d4-a716-446655440000',
            tipo: 'TITULAR',
            autorizadoCheckin: true,
          },
        ],
      })
      .expect(201);

    reservaId = resposta.body.id;

    expect(reservaId).toBeDefined();
    expect(resposta.body.status).toBe('PENDENTE_PAGAMENTO');
    expect(resposta.body.quarto_id).toBe('10');
    expect(resposta.body.valor_diaria_contratada).toBe('350');
    expect(resposta.body.valor_total_contratado).toBe('1050');
    expect(resposta.body.hospede_reserva).toHaveLength(1);

    const reservaNoBanco = await prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { hospede_reserva: true },
    });

    expect(reservaNoBanco).not.toBeNull();
    expect(reservaNoBanco?.hospede_reserva).toHaveLength(1);
  });
  
});
