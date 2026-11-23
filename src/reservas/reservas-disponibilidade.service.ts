
import { Prisma, reserva_status } from '@prisma/client';
import { ConflictException, Injectable, BadRequestException } from '@nestjs/common';
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

  async consultarQuartosIndisponiveis(
    quartoIds: string[],
    checkin: string,
    checkout: string,
  ): Promise<string[]> {
	if (checkin >= checkout) {
  throw new BadRequestException(
    'A data de checkout deve ser posterior à data de checkin.',
  );
}
    const quartosIndisponiveis: string[] = [];

    for (const quartoId of quartoIds) {
      try {
        await this.verificarDisponibilidade(
          BigInt(quartoId),
          checkin,
          checkout,
        );
      } catch (erro) {
        if (erro instanceof ConflictException) {
          quartosIndisponiveis.push(quartoId);
        } else {
          throw erro;
        }
      }
    }

    return quartosIndisponiveis;
  }

  async possuiReservasBloqueantes(quartoId: string): Promise<boolean> {
if (!/^[1-9]\d*$/.test(quartoId)) {
  throw new BadRequestException(
    'O identificador do quarto deve ser um número inteiro positivo.',
  );
}
    const quantidade = await this.prisma.reserva.count({
      where: {
        quarto_id: BigInt(quartoId),
        status: {
          in: [
            reserva_status.PENDENTE_PAGAMENTO,
            reserva_status.CONFIRMADA,
            reserva_status.EM_HOSPEDAGEM,
            reserva_status.CHECKOUT_REALIZADO,
          ],
        },
      },
    });

    return quantidade > 0;
  }
}
