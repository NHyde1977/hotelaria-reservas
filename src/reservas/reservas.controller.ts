
import { Controller, Get } from '@nestjs/common';
import { ReservasService } from './reservas.service';

@Controller('reservas')
export class ReservasController {
  constructor(
    private readonly reservasService: ReservasService,
  ) {}

  @Get()
  async listarReservas() {
    return this.reservasService.listarReservas();
  }
}
