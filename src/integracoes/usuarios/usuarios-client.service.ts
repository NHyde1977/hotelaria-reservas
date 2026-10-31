
import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import { Usuario } from './usuario.interface';

@Injectable()
export class UsuariosClientService {
  constructor(private readonly http: HttpService) {}

  async buscarPorId(usuarioId: string): Promise<Usuario> {
    const baseUrl = process.env.USUARIOS_SERVICE_URL;

    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'O endereço do serviço de Usuários não foi configurado.',
      );
    }

    try {
      const response = await firstValueFrom(
        this.http.get<Usuario>(
          `${baseUrl.replace(/\/$/, '')}/usuarios/${usuarioId}`,
        ),
      );

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new NotFoundException(
            `Usuário ${usuarioId} não encontrado.`,
          );
        }

        if (!error.response) {
          throw new ServiceUnavailableException(
            'Não foi possível acessar o serviço de Usuários.',
          );
        }
      }

      throw new BadGatewayException(
        'O serviço de Usuários retornou uma resposta inesperada.',
      );
    }
  }
}
