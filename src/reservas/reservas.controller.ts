
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';

import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ReservasService } from './reservas.service';

@ApiTags('Reservas')
@Controller('reservas')
export class ReservasController {
  constructor(
    private readonly reservasService: ReservasService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar reservas',
    description: 'Retorna todas as reservas cadastradas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de reservas retornada com sucesso.',
  })
  async listarReservas() {
    return this.reservasService.listarReservas();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar reserva por ID',
    description:
      'Retorna os dados da reserva e seus hóspedes associados.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identificador UUID v4 da reserva.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reserva encontrada.',
  })
  @ApiResponse({
    status: 400,
    description: 'Identificador UUID inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Reserva não encontrada.',
  })
  async buscarReservaPorId(
    @Param('id', new ParseUUIDPipe({ version: '4' }))
    id: string,
  ) {
    return this.reservasService.buscarReservaPorId(id);
  }
}
