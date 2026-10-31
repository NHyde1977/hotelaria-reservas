import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';
import { Quarto } from './quarto.interface';

@Injectable()
export class QuartosClientService {
  constructor(private readonly http: HttpService) {}

  async buscarPorId(quartoId: number): Promise<Quarto> {
    const baseUrl = process.env.QUARTOS_SERVICE_URL;

    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'O endereço do serviço de Quartos não foi configurado.',
      );
    }

    try {
      const response = await firstValueFrom(
        this.http.get<Quarto>(
          `${baseUrl.replace(/\/$/, '')}/quartos/${quartoId}`,
        ),
      );

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new NotFoundException(
            `Quarto ${quartoId} não encontrado.`,
          );
        }

        if (!error.response) {
          throw new ServiceUnavailableException(
            'Não foi possível acessar o serviço de Quartos.',
          );
        }
      }

      throw new BadGatewayException(
        'O serviço de Quartos retornou uma resposta inesperada.',
      );
    }
  }
}
