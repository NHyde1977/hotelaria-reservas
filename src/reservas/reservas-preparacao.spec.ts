
import { ReservasService } from './reservas.service';
import { ReservasCalculoService } from './reservas-calculo.service';
import { CriarReservaDto } from './dto/criar-reserva.dto';
import { TipoHospede } from './dto/criar-hospede.dto';
import { Quarto } from '../integracoes/quartos/quarto.interface';
import { reserva_status } from '@prisma/client';

describe('ReservasService - preparação dos dados', () => {
  let service: ReservasService;

  const titularId = '550e8400-e29b-41d4-a716-446655440000';
  const hospedeId = '550e8400-e29b-41d4-a716-446655440001';

  const dto: CriarReservaDto = {
    quartoId: 10,
    dataPrevisaoCheckin: '2026-12-10',
    dataPrevisaoCheckout: '2026-12-13',
    hospedes: [
      {
        usuarioId: titularId,
        tipo: TipoHospede.TITULAR,
        autorizadoCheckin: true,
      },
      {
        usuarioId: hospedeId,
        tipo: TipoHospede.HOSPEDE,
        autorizadoCheckin: false,
      },
    ],
  };

  const quarto: Quarto = {
    id: 10,
    status: 'ATIVO',
    disponibilidade: 'DISPONIVEL',
    tipo: {
      nome: 'Duplo',
      capacidadeMaxima: 2,
      precoDiaria: '350.00',
    },
  };

  beforeEach(() => {
    service = new ReservasService(
      {} as ConstructorParameters<typeof ReservasService>[0],
      {} as ConstructorParameters<typeof ReservasService>[1],
      {} as ConstructorParameters<typeof ReservasService>[2],
      {} as ConstructorParameters<typeof ReservasService>[3],
      {} as ConstructorParameters<typeof ReservasService>[4],
      {} as ConstructorParameters<typeof ReservasService>[5],
      {} as ConstructorParameters<typeof ReservasService>[6],
      new ReservasCalculoService(),
    );
  });

  it('deve gerar um UUID válido para a reserva', () => {
    const dados = service.prepararDadosCriacao(dto, quarto);

    expect(dados.id).toEqual(
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
    );
  });

  it('deve preparar quarto, datas e status inicial', () => {
    const dados = service.prepararDadosCriacao(dto, quarto);

    expect(dados.quarto_id).toBe(10n);
    expect(dados.data_previsao_checkin).toEqual(
      new Date('2026-12-10T00:00:00Z'),
    );
    expect(dados.data_previsao_checkout).toEqual(
      new Date('2026-12-13T00:00:00Z'),
    );
    expect(dados.status).toBe(reserva_status.PENDENTE_PAGAMENTO);
  });

  it('deve calcular os valores contratados corretamente', () => {
    const dados = service.prepararDadosCriacao(dto, quarto);

    expect(dados.valor_diaria_contratada?.toString()).toBe('350');
    expect(dados.valor_total_contratado?.toString()).toBe('1050');
  });

  it('deve preparar os dois hóspedes vinculados à reserva', () => {
    const dados = service.prepararDadosCriacao(dto, quarto);

    const criacao = dados.hospede_reserva?.create;

    expect(Array.isArray(criacao)).toBe(true);

    if (!Array.isArray(criacao)) {
      throw new Error('Era esperada uma lista de hóspedes.');
    }

    expect(criacao).toHaveLength(2);

    expect(criacao[0]).toEqual(
      expect.objectContaining({
        usuario_id: titularId,
        tipo: TipoHospede.TITULAR,
        autorizado_checkin: true,
      }),
    );

    expect(criacao[1]).toEqual(
      expect.objectContaining({
        usuario_id: hospedeId,
        tipo: TipoHospede.HOSPEDE,
        autorizado_checkin: false,
      }),
    );
  });

  it('deve gerar UUIDs distintos para os hóspedes', () => {
    const dados = service.prepararDadosCriacao(dto, quarto);
    const criacao = dados.hospede_reserva?.create;

    if (!Array.isArray(criacao)) {
      throw new Error('Era esperada uma lista de hóspedes.');
    }

    const ids = criacao.map((hospede) => hospede.id);

    expect(ids[0]).toBeDefined();
    expect(ids[1]).toBeDefined();
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids).not.toContain(dados.id);
  });
});
