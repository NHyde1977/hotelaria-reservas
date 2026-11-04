import { ReservasCalculoService } from './reservas-calculo.service';

import { ReservasQuartosValidacaoService } from './reservas-quartos-validacao.service';

import { Module } from '@nestjs/common';

import { QuartosModule } from '../integracoes/quartos/quartos.module';
import { UsuariosModule } from '../integracoes/usuarios/usuarios.module';

import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { ReservasValidacaoService } from './reservas-validacao.service';
import { ReservasDisponibilidadeService } from './reservas-disponibilidade.service';
import { ReservasUsuariosValidacaoService } from './reservas-usuarios-validacao.service';

@Module({
  imports: [QuartosModule, UsuariosModule],
  controllers: [ReservasController],
  providers: [
    ReservasService,
    ReservasValidacaoService,
    ReservasDisponibilidadeService,
    ReservasUsuariosValidacaoService,
    ReservasQuartosValidacaoService,
  ],
})
export class ReservasModule {}
