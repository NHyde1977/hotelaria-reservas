
import { Module } from '@nestjs/common';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { ReservasValidacaoService } from './reservas-validacao.service';
import { ReservasDisponibilidadeService } from './reservas-disponibilidade.service';

@Module({
  controllers: [ReservasController],
  providers: [
    ReservasService,
    ReservasValidacaoService,
    ReservasDisponibilidadeService,
  ],
})
export class ReservasModule {}
