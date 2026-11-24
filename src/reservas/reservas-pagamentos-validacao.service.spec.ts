import { ReservasPagamentosValidacaoService } from './reservas-pagamentos-validacao.service';
import { Pagamento } from '../integracoes/pagamentos/pagamento.interface';

describe('ReservasPagamentosValidacaoService', () => {
  let service: ReservasPagamentosValidacaoService;

  const pagamentoBase: Pagamento = {
    id: 'pagamento-1',
    reserva_id: 'reserva-1',
    valor: '750.00',
    tipo: 'TOTAL',
    metodo: 'CREDITO',
    status: 'APROVADO',
    data_pagamento: '2026-11-24T12:00:00.000Z',
  };

  beforeEach(() => {
    service = new ReservasPagamentosValidacaoService();
  });

  it('deve aceitar pagamento TOTAL com valor integral', () => {
    expect(
      service.permiteConfirmacao(pagamentoBase, '750.00'),
    ).toBe(true);
  });

  it('deve rejeitar pagamento TOTAL com valor inferior', () => {
    expect(
      service.permiteConfirmacao(
        { ...pagamentoBase, valor: '700.00' },
        '750.00',
      ),
    ).toBe(false);
  });

  it('deve rejeitar pagamento TOTAL com valor superior', () => {
    expect(
      service.permiteConfirmacao(
        { ...pagamentoBase, valor: '800.00' },
        '750.00',
      ),
    ).toBe(false);
  });

  it('deve aceitar SINAL correspondente a 30% da reserva', () => {
    expect(
      service.permiteConfirmacao(
        { ...pagamentoBase, tipo: 'SINAL', valor: '225.00' },
        '750.00',
      ),
    ).toBe(true);
  });

  it('deve rejeitar SINAL com valor incorreto', () => {
    expect(
      service.permiteConfirmacao(
        { ...pagamentoBase, tipo: 'SINAL', valor: '200.00' },
        '750.00',
      ),
    ).toBe(false);
  });

  it('deve aceitar SINAL com arredondamento monetário', () => {
    expect(
      service.permiteConfirmacao(
        { ...pagamentoBase, tipo: 'SINAL', valor: '30.02' },
        '100.05',
      ),
    ).toBe(true);
  });

  it('deve rejeitar SALDO como confirmação inicial', () => {
    expect(
      service.permiteConfirmacao(
        { ...pagamentoBase, tipo: 'SALDO', valor: '525.00' },
        '750.00',
      ),
    ).toBe(false);
  });

  it.each([
    'PENDENTE',
    'ESTORNADO',
    'CANCELADO',
    'RECUSADO',
  ] as const)(
    'deve rejeitar pagamento com status %s',
    (status) => {
      expect(
        service.permiteConfirmacao(
          { ...pagamentoBase, status },
          '750.00',
        ),
      ).toBe(false);
    },
  );

  it.each([
    'PIX',
    'DEBITO',
    'DINHEIRO',
  ] as const)(
    'deve rejeitar pagamento pelo método %s',
    (metodo) => {
      expect(
        service.permiteConfirmacao(
          { ...pagamentoBase, metodo },
          '750.00',
        ),
      ).toBe(false);
    },
  );

  it.each(['0.00', '-100.00'])(
    'deve rejeitar pagamento com valor %s',
    (valor) => {
      expect(
        service.permiteConfirmacao(
          { ...pagamentoBase, valor },
          '750.00',
        ),
      ).toBe(false);
    },
  );

  it.each(['0.00', '-750.00'])(
    'deve rejeitar reserva com valor total %s',
    (valorTotal) => {
      expect(
        service.permiteConfirmacao(
          pagamentoBase,
          valorTotal,
        ),
      ).toBe(false);
    },
  );
});