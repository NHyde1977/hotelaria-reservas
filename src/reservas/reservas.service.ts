import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarReservaDto } from './dto/criar-reserva.dto';
import { ReservasValidacaoService } from './reservas-validacao.service';

@Injectable()
export class ReservasService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly validacao: ReservasValidacaoService,
) {}

  validarDadosCriacao(dto: CriarReservaDto) {
  this.validacao.validarCriacao(dto);

  return {
    valido: true,
    mensagem: 'Validações locais realizadas com sucesso.',
  };
}

  async listarReservas() {
    return this.prisma.reserva.findMany({
      orderBy: {
        data_criacao: 'desc',
      },
    });
  }

  async buscarReservaPorId(id: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        hospede_reserva: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException(
        `Reserva com ID ${id} não encontrada.`,
      );
    }

    return reserva;
  }
}
