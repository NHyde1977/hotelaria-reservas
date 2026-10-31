
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QuartosClientService } from './quartos-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
  ],
  providers: [QuartosClientService],
  exports: [QuartosClientService],
})
export class QuartosModule {}
