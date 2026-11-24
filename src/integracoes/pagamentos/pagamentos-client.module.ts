import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PagamentosClientService } from './pagamentos-client.service';

@Module({
  imports: [HttpModule],
  providers: [PagamentosClientService],
  exports: [PagamentosClientService],
})
export class PagamentosClientModule {}