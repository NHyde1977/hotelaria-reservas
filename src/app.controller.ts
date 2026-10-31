
import { Controller, Get } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiTags('Monitoramento')
  @ApiOperation({
    summary: 'Verificar o funcionamento da API',
    description:
      'Informa se o microsserviço de Reservas está respondendo.',
  })
  @ApiResponse({
    status: 200,
    description: 'API em funcionamento.',
    schema: {
      example: {
        status: 'ok',
        service: 'hotelaria-reservas',
        timestamp: '2026-10-31T01:00:43.954Z',
      },
    },
  })
  health() {
    return {
      status: 'ok',
      service: 'hotelaria-reservas',
      timestamp: new Date().toISOString(),
    };
  }
}
