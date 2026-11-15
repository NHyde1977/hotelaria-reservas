
import { Prisma } from '@prisma/client';
import { ReservasService } from './reservas.service';

describe('ReservasService - formatação da resposta', () => {
  let service: ReservasService;

  beforeEach(() => {
    service = Object.create(ReservasService.prototype) as ReservasService;
  });

  it('deve converter BigInt e Decimal para strings', () => {
    const reserva = {
      id: '550e8400-e29b-41d4-a716-446655440101',
      quarto_id: 10n,
      data_previsao_checkin: new Date('2026-12-10T00:00:00Z'),
      data_previsao_checkout: new Date('2026-12-13T00:00:00Z'),
      data_checkin: null,
      data_checkout: null,
      status: 'PENDENTE_PAGAMENTO',
      valor_diaria_contratada: new Prisma.Decimal('350.00'),
      valor_total_contratado: new Prisma.Decimal('1050.00'),
      data_criacao: new Date('2026-11-14T12:00:00Z'),
      data_atualizacao: new Date('2026-11-14T12:00:00Z'),
      hospede_reserva: [],
    } as Parameters<ReservasService['formatarRespostaReserva']>[0];

    const resultado = service.formatarRespostaReserva(reserva);

    expect(resultado.quarto_id).toBe('10');
    expect(resultado.valor_diaria_contratada).toBe('350');
    expect(resultado.valor_total_contratado).toBe('1050');

    expect(() => JSON.stringify(resultado)).not.toThrow();

    const json = JSON.parse(JSON.stringify(resultado));

    expect(json.quarto_id).toBe('10');
    expect(json.data_previsao_checkin).toBe(
      '2026-12-10T00:00:00.000Z',
    );
  });
});
