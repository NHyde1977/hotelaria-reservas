
import { BadRequestException } from '@nestjs/common';
import { ReservasUsuariosValidacaoService } from './reservas-usuarios-validacao.service';
import { Usuario } from '../integracoes/usuarios/usuario.interface';

describe('ReservasUsuariosValidacaoService', () => {
  let service: ReservasUsuariosValidacaoService;

  const usuario: Usuario = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    nome: 'Maria Silva',
    dataNascimento: '1990-05-20',
    status: 'ATIVO',
    roles: ['CLIENTE'],
  };

  beforeEach(() => {
    service = new ReservasUsuariosValidacaoService();
  });

  it('deve aceitar titular maior de 18 anos', () => {
    expect(() =>
      service.validarMaioridadeTitular(usuario, '2026-11-02'),
    ).not.toThrow();
  });

  it('deve rejeitar titular menor de 18 anos', () => {
    const menor = {
      ...usuario,
      dataNascimento: '2010-05-20',
    };

    expect(() =>
      service.validarMaioridadeTitular(menor, '2026-11-02'),
    ).toThrow(BadRequestException);
  });

  it('deve aceitar titular que completa 18 anos na data de referência', () => {
    const titular = {
      ...usuario,
      dataNascimento: '2008-11-02',
    };

    expect(() =>
      service.validarMaioridadeTitular(titular, '2026-11-02'),
    ).not.toThrow();
  });

  it('deve rejeitar titular na véspera do aniversário de 18 anos', () => {
    const titular = {
      ...usuario,
      dataNascimento: '2008-11-03',
    };

    expect(() =>
      service.validarMaioridadeTitular(titular, '2026-11-02'),
    ).toThrow(BadRequestException);
  });

  it('deve rejeitar data de nascimento inválida', () => {
    const titular = {
      ...usuario,
      dataNascimento: '2008-02-30',
    };

    expect(() =>
      service.validarMaioridadeTitular(titular, '2026-11-02'),
    ).toThrow(BadRequestException);
  });

  
it('deve aceitar usuário com cadastro ativo', () => {
  const usuarioAtivo: Usuario = {
    ...usuario,
    status: 'ATIVO',
  };

  expect(() =>
    service.validarSituacaoCadastral(usuarioAtivo),
  ).not.toThrow();
});

it('deve rejeitar usuário com cadastro inativo', () => {
  const usuarioInativo: Usuario = {
    ...usuario,
    status: 'INATIVO',
  };

  expect(() =>
    service.validarSituacaoCadastral(usuarioInativo),
  ).toThrow(BadRequestException);
});

});
