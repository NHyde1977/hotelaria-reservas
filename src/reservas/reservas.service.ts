import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReservasService {
  constructor(private readonly prisma: PrismaService) {}

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
