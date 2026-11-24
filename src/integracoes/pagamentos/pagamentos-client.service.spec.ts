import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

import { PagamentosClientService } from './pagamentos-client.service';
import { Pagamento } from './pagamento.interface';

describe('PagamentosClientService', () => {
  let service: PagamentosClientService;

  const urlOriginal = process.env.PAGAMENTOS_SERVICE_URL;

  const httpServiceMock = {
    get: jest.fn(),
  };

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
    jest.resetAllMocks();

    process.env.PAGAMENTOS_SERVICE_URL =
      'http://localhost:3004';

    service = new PagamentosClientService(
      httpServiceMock as unknown as HttpService,
    );
  });

  afterEach(() => {
    if (urlOriginal === undefined) {
      delete process.env.PAGAMENTOS_SERVICE_URL;
    } else {
      process.env.PAGAMENTOS_SERVICE_URL = urlOriginal;
    }
  });

  it('deve retornar pagamentos válidos', async () => {
    httpServiceMock.get.mockReturnValue(
      of({ data: [pagamentoBase] }),
    );

    const resultado =
      await service.buscarPorReserva('reserva-1');

    expect(resultado).toEqual([pagamentoBase]);

    expect(httpServiceMock.get).toHaveBeenCalledWith(
      'http://localhost:3004/pagamentos/reserva/reserva-1',
      { timeout: 5000 },
    );
  });

  it('deve retornar uma lista vazia', async () => {
    httpServiceMock.get.mockReturnValue(
      of({ data: [] }),
    );

    await expect(
      service.buscarPorReserva('reserva-1'),
    ).resolves.toEqual([]);
  });

  it('deve remover barras excedentes da URL base', async () => {
    process.env.PAGAMENTOS_SERVICE_URL =
      'http://localhost:3004///';

    httpServiceMock.get.mockReturnValue(
      of({ data: [pagamentoBase] }),
    );

    await service.buscarPorReserva('reserva-1');

    expect(httpServiceMock.get).toHaveBeenCalledWith(
      'http://localhost:3004/pagamentos/reserva/reserva-1',
      { timeout: 5000 },
    );
  });

  it('deve rejeitar URL não configurada', async () => {
    delete process.env.PAGAMENTOS_SERVICE_URL;

    await expect(
      service.buscarPorReserva('reserva-1'),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(httpServiceMock.get).not.toHaveBeenCalled();
  });

  it('deve tratar indisponibilidade de Pagamentos', async () => {
    httpServiceMock.get.mockReturnValue(
      throwError(() => new Error('ECONNREFUSED')),
    );

    await expect(
      service.buscarPorReserva('reserva-1'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('deve tratar timeout da requisição', async () => {
    httpServiceMock.get.mockReturnValue(
      throwError(() => new Error('ETIMEDOUT')),
    );

    await expect(
      service.buscarPorReserva('reserva-1'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it.each([
    ['objeto', {}],
    ['texto', 'resposta inválida'],
    ['null', null],
    ['undefined', undefined],
  ])(
    'deve rejeitar resposta que não seja array: %s',
    async (_descricao, dados) => {
      httpServiceMock.get.mockReturnValue(
        of({ data: dados }),
      );

      await expect(
        service.buscarPorReserva('reserva-1'),
      ).rejects.toThrow(BadGatewayException);
    },
  );

  it.each([
    ['pagamento nulo', null],
    ['ID ausente', { ...pagamentoBase, id: undefined }],
    ['ID numérico', { ...pagamentoBase, id: 123 }],
    [
      'reserva diferente',
      { ...pagamentoBase, reserva_id: 'reserva-2' },
    ],
    [
      'valor numérico',
      { ...pagamentoBase, valor: 750 },
    ],
    [
      'valor inválido',
      { ...pagamentoBase, valor: 'abc' },
    ],
    [
      'valor com três casas decimais',
      { ...pagamentoBase, valor: '750.123' },
    ],
    [
      'valor negativo',
      { ...pagamentoBase, valor: '-750.00' },
    ],
    [
      'tipo inválido',
      { ...pagamentoBase, tipo: 'PARCIAL' },
    ],
    [
      'método inválido',
      { ...pagamentoBase, metodo: 'BOLETO' },
    ],
    [
      'status inválido',
      { ...pagamentoBase, status: 'DESCONHECIDO' },
    ],
    [
      'data ausente',
      { ...pagamentoBase, data_pagamento: undefined },
    ],
  ])(
    'deve rejeitar pagamento inválido: %s',
    async (_descricao, pagamento) => {
      httpServiceMock.get.mockReturnValue(
        of({ data: [pagamento] }),
      );

      await expect(
        service.buscarPorReserva('reserva-1'),
      ).rejects.toThrow(BadGatewayException);
    },
  );

  it('deve rejeitar lista contendo um pagamento inválido', async () => {
    httpServiceMock.get.mockReturnValue(
      of({
        data: [
          pagamentoBase,
          { ...pagamentoBase, status: 'INVALIDO' },
        ],
      }),
    );

    await expect(
      service.buscarPorReserva('reserva-1'),
    ).rejects.toThrow(BadGatewayException);
  });
});