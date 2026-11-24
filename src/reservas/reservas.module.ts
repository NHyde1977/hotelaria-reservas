import { Module } from '@nestjs/common';

import { QuartosModule } from '../integracoes/quartos/quartos.module';
import { UsuariosModule } from '../integracoes/usuarios/usuarios.module';
import { PagamentosClientModule } from '../integracoes/pagamentos/pagamentos-client.module';

import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { ReservasValidacaoService } from './reservas-validacao.service';
import { ReservasDisponibilidadeService } from './reservas-disponibilidade.service';
import { ReservasUsuariosValidacaoService } from './reservas-usuarios-validacao.service';
import { ReservasQuartosValidacaoService } from './reservas-quartos-validacao.service';
import { ReservasCalculoService } from './reservas-calculo.service';
import { ReservasPagamentosValidacaoService } from './reservas-pagamentos-validacao.service';
import { ReservasConfirmacaoService } from './reservas-confirmacao.service';

@Module({
  imports: [
    QuartosModule,
    UsuariosModule,
    PagamentosClientModule,
  ],
  controllers: [
    ReservasController,
  ],
  providers: [
    ReservasService,
    ReservasValidacaoService,
    ReservasDisponibilidadeService,
    ReservasUsuariosValidacaoService,
    ReservasQuartosValidacaoService,
    ReservasCalculoService,
    ReservasPagamentosValidacaoService,
    ReservasConfirmacaoService,
  ],
  exports: [
    ReservasService,
    ReservasPagamentosValidacaoService,
    ReservasConfirmacaoService,
  ],
})
export class ReservasModule {}