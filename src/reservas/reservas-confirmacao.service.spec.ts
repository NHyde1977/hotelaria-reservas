import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ReservasConfirmacaoService } from './reservas-confirmacao.service';
import { ReservasService } from './reservas.service';
import { ReservasPagamentosValidacaoService } from './reservas-pagamentos-validacao.service';
import { PagamentosClientService } from '../integracoes/pagamentos/pagamentos-client.service';
import { Pagamento } from '../integracoes/pagamentos/pagamento.interface';

describe('ReservasConfirmacaoService', () => {
  let service: ReservasConfirmacaoService;

  const reservaBase = {
    id: 'reserva-1',
    status: 'PENDENTE_PAGAMENTO',
    valor_total_contratado: '750.00',
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

  const reservaConfirmada = {
    ...reservaBase,
    status: 'CONFIRMADA',
  };

  const reservasServiceMock = {
    buscarReservaPorId: jest.fn(),
    confirmarReserva: jest.fn(),
  };

  const pagamentosClientMock = {
    buscarPorReserva: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();

    service = new ReservasConfirmacaoService(
      reservasServiceMock as unknown as ReservasService,
      pagamentosClientMock as unknown as PagamentosClientService,
      new ReservasPagamentosValidacaoService(),
    );

    reservasServiceMock.buscarReservaPorId
      .mockResolvedValue(reservaBase);

    reservasServiceMock.confirmarReserva
      .mockResolvedValue(reservaConfirmada);

    pagamentosClientMock.buscarPorReserva
      .mockResolvedValue([pagamentoBase]);
  });

  it('deve confirmar reserva com pagamento TOTAL válido', async () => {
    const resultado = await service.confirmarReserva(
      'reserva-1',
      'pagamento-1',
    );

    expect(resultado).toEqual(reservaConfirmada);

    expect(reservasServiceMock.confirmarReserva)
      .toHaveBeenCalledWith('reserva-1');
  });

  it('deve confirmar reserva com pagamento SINAL válido', async () => {
    pagamentosClientMock.buscarPorReserva.mockResolvedValue([
      {
        ...pagamentoBase,
        tipo: 'SINAL',
        valor: '225.00',
      },
    ]);

    const resultado = await service.confirmarReserva(
      'reserva-1',
      'pagamento-1',
    );

    expect(resultado).toEqual(reservaConfirmada);

    expect(reservasServiceMock.confirmarReserva)
      .toHaveBeenCalledTimes(1);
  });

  it('deve rejeitar reserva já confirmada', async () => {
    reservasServiceMock.buscarReservaPorId
      .mockResolvedValue(reservaConfirmada);

    await expect(
      service.confirmarReserva('reserva-1'),
    ).rejects.toThrow(ConflictException);

    expect(pagamentosClientMock.buscarPorReserva)
      .not.toHaveBeenCalled();

    expect(reservasServiceMock.confirmarReserva)
      .not.toHaveBeenCalled();
  });

  it('deve propagar erro de reserva inexistente', async () => {
    reservasServiceMock.buscarReservaPorId.mockRejectedValue(
      new NotFoundException('Reserva não encontrada.'),
    );

    await expect(
      service.confirmarReserva('reserva-inexistente'),
    ).rejects.toThrow(NotFoundException);

    expect(reservasServiceMock.confirmarReserva)
      .not.toHaveBeenCalled();
  });

  it('deve rejeitar reserva sem pagamentos', async () => {
    pagamentosClientMock.buscarPorReserva.mockResolvedValue([]);

    await expect(
      service.confirmarReserva('reserva-1'),
    ).rejects.toThrow(ConflictException);

    expect(reservasServiceMock.confirmarReserva)
      .not.toHaveBeenCalled();
  });

  it('deve rejeitar pagamento com valor incompatível', async () => {
    pagamentosClientMock.buscarPorReserva.mockResolvedValue([
      { ...pagamentoBase, valor: '700.00' },
    ]);

    await expect(
      service.confirmarReserva('reserva-1', 'pagamento-1'),
    ).rejects.toThrow(ConflictException);

    expect(reservasServiceMock.confirmarReserva)
      .not.toHaveBeenCalled();
  });

  it('deve rejeitar pagamento estornado', async () => {
    pagamentosClientMock.buscarPorReserva.mockResolvedValue([
      { ...pagamentoBase, status: 'ESTORNADO' },
    ]);

    await expect(
      service.confirmarReserva('reserva-1', 'pagamento-1'),
    ).rejects.toThrow(ConflictException);

    expect(reservasServiceMock.confirmarReserva)
      .not.toHaveBeenCalled();
  });

  it('deve rejeitar pagamento indicado no evento inexistente', async () => {
    await expect(
      service.confirmarReserva(
        'reserva-1',
        'pagamento-inexistente',
      ),
    ).rejects.toThrow(ConflictException);

    expect(reservasServiceMock.confirmarReserva)
      .not.toHaveBeenCalled();
  });

  it('deve propagar indisponibilidade de Pagamentos', async () => {
    pagamentosClientMock.buscarPorReserva.mockRejectedValue(
      new ServiceUnavailableException(
        'Microsserviço indisponível.',
      ),
    );

    await expect(
      service.confirmarReserva('reserva-1'),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(reservasServiceMock.confirmarReserva)
      .not.toHaveBeenCalled();
  });

  it('deve permitir confirmação sem informar pagamentoId quando houver pagamento elegível', async () => {
    const resultado = await service.confirmarReserva(
      'reserva-1',
    );

    expect(resultado).toEqual(reservaConfirmada);

    expect(reservasServiceMock.confirmarReserva)
      .toHaveBeenCalledWith('reserva-1');
  });

  it('deve impedir confirmação sem pagamentoId quando não houver pagamento elegível', async () => {
    pagamentosClientMock.buscarPorReserva.mockResolvedValue([
      { ...pagamentoBase, status: 'PENDENTE' },
    ]);

    await expect(
      service.confirmarReserva('reserva-1'),
    ).rejects.toThrow(ConflictException);

    expect(reservasServiceMock.confirmarReserva)
      .not.toHaveBeenCalled();
  });

  it('não deve substituir o pagamento do evento por outro pagamento válido', async () => {
    pagamentosClientMock.buscarPorReserva.mockResolvedValue([
      { ...pagamentoBase, status: 'ESTORNADO' },
      { ...pagamentoBase, id: 'pagamento-2' },
    ]);

    await expect(
      service.confirmarReserva('reserva-1', 'pagamento-1'),
    ).rejects.toThrow(ConflictException);

    expect(reservasServiceMock.confirmarReserva)
      .not.toHaveBeenCalled();
  });
});