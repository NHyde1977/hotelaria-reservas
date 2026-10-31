
import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { UsuariosClientService } from './usuarios-client.service';
import { Usuario } from './usuario.interface';

describe('UsuariosClientService', () => {
  let service: UsuariosClientService;
  let httpGet: jest.Mock;
  const usuarioId = '550e8400-e29b-41d4-a716-446655440000';

  const usuario: Usuario = {
    id: usuarioId,
    nome: 'Maria Silva',
    dataNascimento: '1990-05-20',
    status: 'ATIVO',
    roles: ['CLIENTE'],
  };

  beforeEach(() => {
    process.env.USUARIOS_SERVICE_URL = 'http://localhost:3002';

    httpGet = jest.fn();

    const httpMock = {
      get: httpGet,
    } as unknown as HttpService;

    service = new UsuariosClientService(httpMock);
  });

  afterAll(() => {
    delete process.env.USUARIOS_SERVICE_URL;
  });

  it('deve retornar os dados de um usuário existente', async () => {
    const response = {
      data: usuario,
      status: 200,
    } as AxiosResponse<Usuario>;

    httpGet.mockReturnValue(of(response));

    await expect(service.buscarPorId(usuarioId)).resolves.toEqual(usuario);
  });

  it('deve retornar 404 quando o usuário não existir', async () => {
    const error = new AxiosError(
      'Usuário não encontrado',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
  status: 404,
  statusText: 'Not Found',
  data: {},
  headers: {},
  config: {} as any,
},
    );

    httpGet.mockReturnValue(throwError(() => error));

    await expect(service.buscarPorId(usuarioId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deve retornar 503 quando o serviço estiver indisponível', async () => {
    const error = new AxiosError('ECONNREFUSED', 'ECONNREFUSED');

    httpGet.mockReturnValue(throwError(() => error));

    await expect(service.buscarPorId(usuarioId)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('deve retornar 502 quando o serviço externo retornar erro 500', async () => {
    const error = new AxiosError(
      'Erro interno',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
  status: 500,
  statusText: 'Internal Server Error',
  data: {},
  headers: {},
  config: {} as any,
},
    );

    httpGet.mockReturnValue(throwError(() => error));

    await expect(service.buscarPorId(usuarioId)).rejects.toThrow(
      BadGatewayException,
    );
  });

  it('deve retornar 503 quando a URL não estiver configurada', async () => {
    delete process.env.USUARIOS_SERVICE_URL;

    await expect(service.buscarPorId(usuarioId)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('deve utilizar o endpoint de consulta por ID', async () => {
    const response = {
      data: usuario,
      status: 200,
    } as AxiosResponse<Usuario>;

    httpGet.mockReturnValue(of(response));

    await service.buscarPorId(usuarioId);

    expect(httpGet).toHaveBeenCalledWith(
      `http://localhost:3002/usuarios/${usuarioId}`,
    );
  });
});
