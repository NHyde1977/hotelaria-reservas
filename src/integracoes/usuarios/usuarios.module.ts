
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsuariosClientService } from './usuarios-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
  ],
  providers: [UsuariosClientService],
  exports: [UsuariosClientService],
})
export class UsuariosModule {}
