import {
  Injectable,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Pagamento } from './pagamento.interface';

@Injectable()
export class PagamentosClientService {
  constructor(private readonly httpService: HttpService) {}

  async buscarPorReserva(reservaId: string): Promise<Pagamento[]> {
    const baseUrl = process.env.PAGAMENTOS_SERVICE_URL;

    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'URL do microsserviço de Pagamentos não configurada.',
      );
    }

    let dados: unknown;

    try {
      const resposta = await firstValueFrom(
        this.httpService.get(
          `${baseUrl.replace(/\/+$/, '')}/pagamentos/reserva/${reservaId}`,
          { timeout: 5000 },
        ),
      );

      dados = resposta.data;
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível consultar o microsserviço de Pagamentos.',
      );
    }

    if (!Array.isArray(dados) || !dados.every((item) =>
      item &&
      typeof item.id === 'string' &&
      item.reserva_id === reservaId &&
      typeof item.valor === 'string' &&
      /^\d+(\.\d{1,2})?$/.test(item.valor) &&
      ['SINAL', 'TOTAL', 'SALDO'].includes(item.tipo) &&
      ['CREDITO', 'DEBITO', 'PIX', 'DINHEIRO'].includes(item.metodo) &&
      ['PENDENTE', 'APROVADO', 'RECUSADO', 'CANCELADO', 'ESTORNADO'].includes(item.status) &&
      typeof item.data_pagamento === 'string'
    )) {
      throw new BadGatewayException(
        'Resposta inválida do microsserviço de Pagamentos.',
      );
    }

    return dados as Pagamento[];
  }
}