import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';

import { RmqContext } from '@nestjs/microservices';
import { PagamentosConsumerController } from './pagamentos-consumer.controller';
import { ReservasConfirmacaoService } from '../../reservas/reservas-confirmacao.service';

describe('PagamentosConsumerController', () => {
  let controller: PagamentosConsumerController;
  let contexto: RmqContext;

  const confirmacaoMock = {
    confirmarReserva: jest.fn(),
  };

  const canalMock = {
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mensagem = {};

  const eventoValido = {
    evento: 'pagamento.aprovado',
    dados: {
      pagamento_id: '4ec039ce-767f-4589-be63-f1a636b91789',
      reserva_id: '13d1a16b-9076-46db-83b9-cc33968b4192',
      valor: '225',
      tipo: 'SINAL',
      metodo: 'CREDITO',
      status: 'APROVADO',
    },
    data_hora: '2026-11-24T16:46:09.000Z',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    controller = new PagamentosConsumerController(
      confirmacaoMock as unknown as ReservasConfirmacaoService,
    );

    contexto = {
      getChannelRef: () => canalMock,
      getMessage: () => mensagem,
    } as unknown as RmqContext;

    confirmacaoMock.confirmarReserva.mockResolvedValue({
      status: 'CONFIRMADA',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve processar evento válido e enviar ACK', async () => {
    await controller.processarPagamentoAprovado(
      eventoValido,
      contexto,
    );

    expect(confirmacaoMock.confirmarReserva)
      .toHaveBeenCalledWith(
        eventoValido.dados.reserva_id,
        eventoValido.dados.pagamento_id,
      );

    expect(canalMock.ack).toHaveBeenCalledTimes(1);
    expect(canalMock.ack).toHaveBeenCalledWith(mensagem);
    expect(canalMock.nack).not.toHaveBeenCalled();
  });

  it('deve rejeitar evento vazio com NACK', async () => {
    await controller.processarPagamentoAprovado(
      {},
      contexto,
    );

    expect(confirmacaoMock.confirmarReserva)
      .not.toHaveBeenCalled();

    expect(canalMock.nack)
      .toHaveBeenCalledWith(mensagem, false, false);

    expect(canalMock.ack).not.toHaveBeenCalled();
  });

  it('deve rejeitar evento com UUID inválido', async () => {
    const eventoInvalido = {
      ...eventoValido,
      dados: {
        ...eventoValido.dados,
        pagamento_id: 'id-invalido',
      },
    };

    await controller.processarPagamentoAprovado(
      eventoInvalido,
      contexto,
    );

    expect(confirmacaoMock.confirmarReserva)
      .not.toHaveBeenCalled();

    expect(canalMock.nack)
      .toHaveBeenCalledWith(mensagem, false, false);

    expect(canalMock.ack).not.toHaveBeenCalled();
  });

  it('deve enviar ACK diante de conflito de negócio', async () => {
    confirmacaoMock.confirmarReserva.mockRejectedValue(
      new ConflictException('Pagamento não elegível.'),
    );

    await controller.processarPagamentoAprovado(
      eventoValido,
      contexto,
    );

    expect(canalMock.ack).toHaveBeenCalledWith(mensagem);
    expect(canalMock.nack).not.toHaveBeenCalled();
  });

  it('deve enviar ACK quando a reserva não existir', async () => {
    confirmacaoMock.confirmarReserva.mockRejectedValue(
      new NotFoundException('Reserva não encontrada.'),
    );

    await controller.processarPagamentoAprovado(
      eventoValido,
      contexto,
    );

    expect(canalMock.ack).toHaveBeenCalledWith(mensagem);
    expect(canalMock.nack).not.toHaveBeenCalled();
  });

  it('deve enviar NACK diante de falha técnica', async () => {
    confirmacaoMock.confirmarReserva.mockRejectedValue(
      new ServiceUnavailableException(
        'Pagamentos indisponível.',
      ),
    );

    await controller.processarPagamentoAprovado(
      eventoValido,
      contexto,
    );

    expect(canalMock.nack)
      .toHaveBeenCalledWith(mensagem, false, false);

    expect(canalMock.ack).not.toHaveBeenCalled();
  });
});