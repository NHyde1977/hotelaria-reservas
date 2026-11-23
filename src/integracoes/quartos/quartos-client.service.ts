
import {
  BadGatewayException,
  ConflictException,
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

  async buscarPorId(quartoId: string): Promise<Quarto> {
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

  async buscarDisponiveis(
    checkin: string,
    checkout: string,
  ): Promise<Quarto[]> {
    const baseUrl = process.env.QUARTOS_SERVICE_URL;
    const apiKey = process.env.INTERNAL_API_KEY;

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        'A integração com Quartos não está configurada.',
      );
    }

    try {
      const response = await firstValueFrom(
        this.http.get<Quarto[]>(
          `${baseUrl.replace(/\/$/, '')}/quartos/disponiveis`,
          {
            params: { checkin, checkout },
            headers: {
              'x-internal-api-key': apiKey,
            },
          },
        ),
      );

      if (!Array.isArray(response.data)) {
        throw new BadGatewayException(
          'O serviço de Quartos retornou dados inválidos.',
        );
      }

      return response.data;
    } catch (error: unknown) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (!error.response || error.response.status === 503) {
          throw new ServiceUnavailableException(
            'O serviço de disponibilidade está indisponível.',
          );
        }
      }

      throw new BadGatewayException(
        'Não foi possível consultar os quartos disponíveis.',
      );
    }
  }

  async selecionarQuartoDisponivel(
    tipoQuartoId: string,
    checkin: string,
    checkout: string,
    quantidadeHospedes: number,
  ): Promise<Quarto> {
    const quartos = await this.buscarDisponiveis(checkin, checkout);

    const candidatos = quartos
      .filter(
        (quarto) =>
          quarto.id_tipo_quarto === tipoQuartoId &&
          quarto.status === 'ATIVO' &&
          quarto.disponibilidade === 'DISPONIVEL' &&
          quarto.tipo_quarto.capacidade_maxima >= quantidadeHospedes,
      )
      .sort((a, b) =>
        BigInt(a.id) < BigInt(b.id)
          ? -1
          : BigInt(a.id) > BigInt(b.id)
            ? 1
            : 0,
      );

    const quartoSelecionado = candidatos[0];

    if (!quartoSelecionado) {
      throw new ConflictException(
        'Não há quartos disponíveis desse tipo para o período e a quantidade de hóspedes informados.',
      );
    }

    return quartoSelecionado;
  }
}
