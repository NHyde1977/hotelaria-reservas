import {
  Controller,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PagamentoEventoDto } from './pagamento-evento.dto';
import { ReservasConfirmacaoService } from '../../reservas/reservas-confirmacao.service';

@Controller()
export class PagamentosConsumerController {
  private readonly logger = new Logger(
    PagamentosConsumerController.name,
  );

  constructor(
    private readonly reservasConfirmacao: ReservasConfirmacaoService,
  ) {}

  @EventPattern('pagamento.aprovado')
  async processarPagamentoAprovado(
    @Payload() payload: unknown,
    @Ctx() context: RmqContext,
  ) {
    const canal = context.getChannelRef();
    const mensagem = context.getMessage();

    try {
      const evento = plainToInstance(
        PagamentoEventoDto,
        payload,
      );

      const erros = evento
        ? await validate(evento, {
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
          })
        : [true];

      if (erros.length > 0) {
        this.logger.warn('Evento de pagamento inválido.');
        canal.nack(mensagem, false, false);
        return;
      }

      const { pagamento_id, reserva_id } = evento.dados;

      await this.reservasConfirmacao.confirmarReserva(
        reserva_id,
        pagamento_id,
      );

      this.logger.log(
        `Reserva ${reserva_id} confirmada pelo pagamento ${pagamento_id}.`,
      );

      canal.ack(mensagem);

    } catch (erro) {
      if (
        erro instanceof NotFoundException ||
        erro instanceof ConflictException
      ) {
        this.logger.warn(erro.message);
        canal.ack(mensagem);
        return;
      }

      this.logger.error(
        'Falha no processamento do evento pagamento.aprovado.',
        erro instanceof Error ? erro.stack : String(erro),
      );

      canal.nack(mensagem, false, false);
    }
  }
}