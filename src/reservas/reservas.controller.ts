import { Body, HttpCode, Post } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { CriarReservaDto } from './dto/criar-reserva.dto';
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

  @Post()
  @ApiOperation({
    summary: 'Validar solicitação de criação de reserva',
    description:
      'Executa as validações locais, consulta os microsserviços de ' +
      'Usuários e Quartos e verifica conflitos de disponibilidade ' +
      'no banco de Reservas. Ainda não realiza a criação da reserva.',
  })
  @ApiBody({ type: CriarReservaDto })
  @ApiResponse({
    status: 200,
    description: 'Solicitação validada com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou regras de negócio não atendidas.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário ou quarto não encontrado.',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe uma reserva para o quarto no período solicitado.',
  })
  @ApiResponse({
    status: 502,
    description: 'Resposta inesperada de um microsserviço externo.',
  })
  @ApiResponse({
    status: 503,
    description: 'Microsserviço externo indisponível.',
  })
  @HttpCode(200)
  async validarCriacao(@Body() dto: CriarReservaDto) {
    return this.reservasService.validarDadosCriacao(dto);
  }


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
