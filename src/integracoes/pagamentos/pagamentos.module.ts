import { Module } from '@nestjs/common';
import { ReservasModule } from '../../reservas/reservas.module';
import { PagamentosConsumerController } from './pagamentos-consumer.controller';

@Module({
  imports: [ReservasModule],
  controllers: [PagamentosConsumerController],
})
export class PagamentosModule {}