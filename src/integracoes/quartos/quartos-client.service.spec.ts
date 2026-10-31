
import {
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { QuartosClientService } from './quartos-client.service';
import { Quarto } from './quarto.interface';

describe('QuartosClientService', () => {
  let service: QuartosClientService;
  let httpGet: jest.Mock;
  const urlOriginal = process.env.QUARTOS_SERVICE_URL;

  beforeEach(() => {
    process.env.QUARTOS_SERVICE_URL = 'http://localhost:3001';

    httpGet = jest.fn();

    const httpMock = {
      get: httpGet,
    } as unknown as HttpService;

    service = new QuartosClientService(httpMock);
  });

  afterAll(() => {
    if (urlOriginal === undefined) {
      delete process.env.QUARTOS_SERVICE_URL;
    } else {
      process.env.QUARTOS_SERVICE_URL = urlOriginal;
    }
  });

  it('deve retornar os dados de um quarto existente', async () => {
    const quarto: Quarto = {
      id: 101,
      status: 'ATIVO',
      disponibilidade: 'DISPONIVEL',
      tipo: {
        nome: 'Duplo',
        capacidadeMaxima: 2,
        precoDiaria: '350.00',
      },
    };

    httpGet.mockReturnValue(
      of({ data: quarto } as AxiosResponse<Quarto>),
    );

    await expect(service.buscarPorId(101)).resolves.toEqual(quarto);
  });

  it('deve retornar 404 quando o quarto não existir', async () => {
    const erro = new AxiosError(
      'Not Found',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      { status: 404, data: {}, headers: {}, config: {} as never, statusText: 'Not Found' },
    );

    httpGet.mockReturnValue(throwError(() => erro));

    await expect(service.buscarPorId(999))
      .rejects.toThrow(NotFoundException);
  });

  it('deve retornar 503 quando o serviço estiver indisponível', async () => {
    const erro = new AxiosError('Network Error', 'ERR_NETWORK');

    httpGet.mockReturnValue(throwError(() => erro));

    await expect(service.buscarPorId(101))
      .rejects.toThrow(ServiceUnavailableException);
  });

  it('deve retornar 502 quando o serviço externo retornar erro 500', async () => {
    const erro = new AxiosError(
      'Internal Server Error',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      { status: 500, data: {}, headers: {}, config: {} as never, statusText: 'Internal Server Error' },
    );

    httpGet.mockReturnValue(throwError(() => erro));

    await expect(service.buscarPorId(101))
      .rejects.toThrow(BadGatewayException);
  });

  it('deve retornar 503 quando a URL não estiver configurada', async () => {
    delete process.env.QUARTOS_SERVICE_URL;

    await expect(service.buscarPorId(101))
      .rejects.toThrow(ServiceUnavailableException);

    expect(httpGet).not.toHaveBeenCalled();
  });

  it('deve utilizar o endpoint de consulta por ID', async () => {
    httpGet.mockReturnValue(
      of({ data: { id: 101 } } as AxiosResponse),
    );

    await service.buscarPorId(101);

    expect(httpGet).toHaveBeenCalledWith(
      'http://localhost:3001/quartos/101',
    );
  });
});
