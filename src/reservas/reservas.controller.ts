import { ConsultarDisponibilidadeDto } from './dto/consultar-disponibilidade.dto';
import { ReservasDisponibilidadeService } from './reservas-disponibilidade.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CriarReservaDto } from './dto/criar-reserva.dto';
import { ReservasService } from './reservas.service';
import { ReservasConfirmacaoService } from './reservas-confirmacao.service';
import { InternalApiKeyGuard } from '../common/guards/internal-api-key.guard';


@ApiTags('Reservas')
@Controller('reservas')
export class ReservasController {
  constructor(
  private readonly reservasService: ReservasService,
  private readonly disponibilidadeService: ReservasDisponibilidadeService,
  private readonly reservasConfirmacao: ReservasConfirmacaoService,
) {}

  
  @Post()
  @ApiOperation({
    summary: 'Criar reserva',
    description:
      'Valida os dados da solicitação, consulta os microsserviços ' +
      'de Usuários e Quartos, verifica a disponibilidade e cria ' +
      'a reserva com status PENDENTE_PAGAMENTO.',
  })
  @ApiBody({ type: CriarReservaDto })
  @ApiResponse({
    status: 201,
    description: 'Reserva criada com sucesso.',
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
    description: 'Microsserviço externo indisponível ou conflito transacional.',
  })
  @HttpCode(201)
  async criarReserva(@Body() dto: CriarReservaDto) {
    return this.reservasService.criarReserva(dto);
  }

  async validarCriacao(@Body() dto: CriarReservaDto) {
    const { valido, mensagem } =
      await this.reservasService.validarDadosCriacao(dto);

    return {
      valido,
      mensagem,
    };
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


@Post('disponibilidade/consultar')
@UseGuards(InternalApiKeyGuard)
@HttpCode(200)
@ApiOperation({
  summary: 'Consultar disponibilidade de quartos',
})
@ApiResponse({
  status: 200,
  description: 'Lista de quartos indisponíveis no período.',
})
async consultarDisponibilidade(
  @Body() dto: ConsultarDisponibilidadeDto
) {
  const quartosIndisponiveis =
    await this.disponibilidadeService.consultarQuartosIndisponiveis(
      dto.quartoIds,
      dto.checkin,
      dto.checkout,
    );

  return { quartosIndisponiveis };
}


@Get('quartos/:quartoId/bloqueio-inativacao')
@UseGuards(InternalApiKeyGuard)
@ApiOperation({
  summary: 'Consultar bloqueio de inativação de quarto',
})
@ApiParam({
  name: 'quartoId',
  description: 'Identificador do quarto.',
  example: '1',
})
@ApiResponse({
  status: 200,
  description: 'Situação de bloqueio retornada com sucesso.',
})
async consultarBloqueioInativacao(
  @Param('quartoId') quartoId: string,
) {
  const possuiReservasBloqueantes =
    await this.disponibilidadeService.possuiReservasBloqueantes(
      quartoId,
    );

  return {
    quartoId,
    possuiReservasBloqueantes,
  };
}


  @Get(':id')
  @ApiOperation({
    summary: 'Consultar reserva por ID',
    description: 'Retorna os dados da reserva e seus hóspedes associados.',
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

 @Patch(':id/confirmar')
@UseGuards(InternalApiKeyGuard)
@ApiOperation({ summary: 'Confirmar reserva após pagamento' })
@ApiResponse({ status: 200, description: 'Reserva confirmada.' })
@ApiResponse({ status: 404, description: 'Reserva não encontrada.' })
@ApiResponse({ status: 409, description: 'Reserva ou pagamento não elegível para confirmação.' })
@ApiResponse({ status: 502, description: 'Resposta inválida de Pagamentos.' })
@ApiResponse({ status: 503, description: 'Microsserviço de Pagamentos indisponível.' })
async confirmarReserva(
  @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
) {
  return this.reservasConfirmacao.confirmarReserva(id);
}

  @Patch(':id/cancelar')
  @UseGuards(InternalApiKeyGuard)
  @ApiOperation({ summary: 'Cancelar reserva' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada.' })
  async cancelarReserva(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.reservasService.cancelarReserva(id);
  }

  @Patch(':id/checkin')
  @UseGuards(InternalApiKeyGuard)
  @ApiOperation({ summary: 'Realizar check-in' })
  @ApiResponse({ status: 200, description: 'Check-in realizado.' })
  async realizarCheckin(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.reservasService.realizarCheckin(id);
  }

  @Patch(':id/checkout')
  @UseGuards(InternalApiKeyGuard)
  @ApiOperation({ summary: 'Realizar checkout' })
  @ApiResponse({ status: 200, description: 'Checkout realizado.' })
  async realizarCheckout(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.reservasService.realizarCheckout(id);
  }

  @Patch(':id/finalizar')
  @UseGuards(InternalApiKeyGuard)
  @ApiOperation({ summary: 'Finalizar reserva' })
  @ApiResponse({ status: 200, description: 'Reserva finalizada.' })
  async finalizarReserva(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.reservasService.finalizarReserva(id);
  }

}
