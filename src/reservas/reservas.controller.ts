import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
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

  @Get(':id')
  async buscarReservaPorId(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.reservasService.buscarReservaPorId(id);
  }
}
