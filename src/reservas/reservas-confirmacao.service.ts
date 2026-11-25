import { ConflictException, Injectable } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { ReservasPagamentosValidacaoService } from './reservas-pagamentos-validacao.service';
import { PagamentosClientService } from '../integracoes/pagamentos/pagamentos-client.service';

@Injectable()
export class ReservasConfirmacaoService {
  constructor(
    private readonly reservasService: ReservasService,
    private readonly pagamentosClient: PagamentosClientService,
    private readonly pagamentosValidacao: ReservasPagamentosValidacaoService,
  ) {}

  async confirmarReserva(
    reservaId: string,
    pagamentoId?: string,
  ) {
    const reserva =
      await this.reservasService.buscarReservaPorId(reservaId);

    if (reserva.status !== 'PENDENTE_PAGAMENTO') {
      throw new ConflictException(
        `Reserva ${reservaId} não está pendente de pagamento.`,
      );
    }

    const pagamentos =
      await this.pagamentosClient.buscarPorReserva(reservaId);

    const pagamentoValido = pagamentos.find(
      (pagamento) =>
        (!pagamentoId || pagamento.id === pagamentoId) &&
        this.pagamentosValidacao.permiteConfirmacao(
          pagamento,
          reserva.valor_total_contratado,
        ),
    );

    if (!pagamentoValido) {
      throw new ConflictException(
        'Não existe pagamento elegível para confirmar a reserva.',
      );
    }

    return this.reservasService.confirmarReserva(reservaId);
  }

  async finalizarReserva(reservaId: string) {
  const reserva =
    await this.reservasService.buscarReservaPorId(reservaId);

  if (reserva.status !== 'CHECKOUT_REALIZADO') {
    throw new ConflictException(
      `Reserva ${reservaId} não está com checkout realizado.`,
    );
  }

  const pagamentos =
    await this.pagamentosClient.buscarPorReserva(reservaId);

  if (!this.pagamentosValidacao.permiteFinalizacao(
    pagamentos,
    reserva.valor_total_contratado,
  )) {
    throw new ConflictException(
      'Não é possível finalizar a reserva sem a quitação integral.',
    );
  }

  return this.reservasService.finalizarReserva(reservaId);
}
}