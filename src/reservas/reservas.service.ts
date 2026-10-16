
import { Injectable } from '@nestjs/common';
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
}
