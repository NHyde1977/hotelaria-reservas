import { Prisma, reserva_status } from '@prisma/client';
import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class ReservasDisponibilidadeService {
  constructor(private readonly prisma: PrismaService) {}
  

  async verificarDisponibilidade(
  quartoId: bigint,
  checkin: string,
  checkout: string,
  reservaIdExcluir?: string,
  transacao?: Prisma.TransactionClient,
): Promise<void> {
  const cliente = transacao ?? this.prisma;
  const conflito = await cliente.reserva.findFirst({
      where: {
        quarto_id: quartoId,

        status: {
          in: [
            reserva_status.PENDENTE_PAGAMENTO,
            reserva_status.CONFIRMADA,
            reserva_status.EM_HOSPEDAGEM,
            reserva_status.CHECKOUT_REALIZADO,
          ],
        },

        data_previsao_checkin: {
          lt: new Date(`${checkout}T00:00:00Z`),
        },

        data_previsao_checkout: {
          gt: new Date(`${checkin}T00:00:00Z`),
        },

        ...(reservaIdExcluir
          ? { id: { not: reservaIdExcluir } }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (conflito) {
      throw new ConflictException(
        'O quarto já possui uma reserva para o período solicitado.',
      );
    }
  }
}
