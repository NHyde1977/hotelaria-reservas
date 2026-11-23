import { ReservasCalculoService } from './reservas-calculo.service';

import { ReservasDisponibilidadeService } from './reservas-disponibilidade.service';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ReservasService } from './reservas.service';
import { ReservasValidacaoService } from './reservas-validacao.service';
import { ReservasUsuariosValidacaoService } from './reservas-usuarios-validacao.service';
import { ReservasQuartosValidacaoService } from './reservas-quartos-validacao.service';

import { UsuariosClientService } from '../integracoes/usuarios/usuarios-client.service';
import { QuartosClientService } from '../integracoes/quartos/quartos-client.service';
import { PrismaService } from '../prisma/prisma.service';

import { CriarReservaDto } from './dto/criar-reserva.dto';
import { TipoHospede } from './dto/criar-hospede.dto';
import { Usuario } from '../integracoes/usuarios/usuario.interface';
import { Quarto } from '../integracoes/quartos/quarto.interface';

describe('ReservasService - validação de usuários e quartos', () => {
  let service: ReservasService;

  let usuariosClient: { buscarPorId: jest.Mock };
  let quartosClient: {
  buscarPorId: jest.Mock;
  selecionarQuartoDisponivel: jest.Mock;
};
  let disponibilidade: {
  verificarDisponibilidade: jest.Mock;
};

  const titularId = '550e8400-e29b-41d4-a716-446655440000';
  const hospedeId = '550e8400-e29b-41d4-a716-446655440001';

  let dto: CriarReservaDto;

  
const quartoValido: Quarto = {
  id: '1',
  id_tipo_quarto: '2',
  numero: 101,
  status: 'ATIVO',
  disponibilidade: 'DISPONIVEL',
  tipo_quarto: {
    id: '2',
    nome: 'Duplo',
    capacidade_maxima: 2,
    preco_diaria: '350.00',
  },
};


  // Preparação executada antes de cada teste.
  beforeEach(() => {
    usuariosClient = {
      buscarPorId: jest.fn(),
    };

    quartosClient = {
  buscarPorId: jest.fn().mockResolvedValue(quartoValido),
  selecionarQuartoDisponivel: jest.fn().mockResolvedValue(quartoValido),
};

    disponibilidade = {
  verificarDisponibilidade: jest.fn().mockResolvedValue(undefined),
};

    service = new ReservasService(
  {} as PrismaService,
  new ReservasValidacaoService(),
  usuariosClient as unknown as UsuariosClientService,
  new ReservasUsuariosValidacaoService(),
  quartosClient as unknown as QuartosClientService,
  new ReservasQuartosValidacaoService(),
  disponibilidade as unknown as ReservasDisponibilidadeService,
  new ReservasCalculoService(),
);

    const hoje = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const dataCheckin = new Date(`${hoje}T12:00:00Z`);
    dataCheckin.setUTCDate(dataCheckin.getUTCDate() + 10);

    const dataCheckout = new Date(dataCheckin);
    dataCheckout.setUTCDate(dataCheckout.getUTCDate() + 3);

    dto = {
      quartoId: '1',
      dataPrevisaoCheckin: dataCheckin.toISOString().slice(0, 10),
      dataPrevisaoCheckout: dataCheckout.toISOString().slice(0, 10),
      hospedes: [
        {
          usuarioId: titularId,
          tipo: TipoHospede.TITULAR,
          autorizadoCheckin: true,
        },
        {
          usuarioId: hospedeId,
          tipo: TipoHospede.HOSPEDE,
          autorizadoCheckin: false,
        },
      ],
    };
  });

  // Função auxiliar para criar usuários simulados.
  const criarUsuario = (
    id: string,
    status: Usuario['status'] = 'ATIVO',
    dataNascimento = '1990-05-20',
  ): Usuario => ({
    id,
    nome: 'Usuário de Teste',
    dataNascimento,
    status,
    roles: ['CLIENTE'],
  });

  // TESTE 1 - Reserva válida.
  it('deve aceitar reserva com usuários e quarto válidos', async () => {
    usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
      criarUsuario(id),
    );

    
await expect(service.validarDadosCriacao(dto)).resolves.toMatchObject({
  valido: true,
  mensagem:
    'Validações locais, de usuários e de quarto realizadas com sucesso.',
  quarto: {
    id: '1',
    id_tipo_quarto: '2',
    numero: 101,
    status: 'ATIVO',
    disponibilidade: 'DISPONIVEL',
    tipo_quarto: {
      id: '2',
      nome: 'Duplo',
      capacidade_maxima: 2,
      preco_diaria: '350.00',
    },
  },
});


    expect(usuariosClient.buscarPorId).toHaveBeenCalledTimes(2);
    expect(usuariosClient.buscarPorId).toHaveBeenCalledWith(titularId);
    expect(usuariosClient.buscarPorId).toHaveBeenCalledWith(hospedeId);

    expect(quartosClient.buscarPorId).toHaveBeenCalledTimes(1);
    expect(quartosClient.buscarPorId).toHaveBeenCalledWith('1');
  });

  // TESTE 2 - Hóspede com cadastro inativo.
  it('deve rejeitar reserva quando um hóspede estiver inativo', async () => {
    usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
      criarUsuario(id, id === hospedeId ? 'INATIVO' : 'ATIVO'),
    );

    await expect(service.validarDadosCriacao(dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(quartosClient.buscarPorId).not.toHaveBeenCalled();
  });

  // TESTE 3 - Titular menor de idade.
  it('deve rejeitar reserva quando o titular for menor de idade', async () => {
    usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
      criarUsuario(
        id,
        'ATIVO',
        id === titularId ? '2010-05-20' : '1990-05-20',
      ),
    );

    await expect(service.validarDadosCriacao(dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(quartosClient.buscarPorId).not.toHaveBeenCalled();
  });

  // TESTE 4 - Usuário inexistente.
  it('deve rejeitar reserva quando um usuário não existir', async () => {
    usuariosClient.buscarPorId.mockRejectedValue(
      new NotFoundException('Usuário não encontrado.'),
    );

    await expect(service.validarDadosCriacao(dto)).rejects.toThrow(
      NotFoundException,
    );

    expect(quartosClient.buscarPorId).not.toHaveBeenCalled();
  });

  // TESTE 5 - Serviço de Usuários indisponível.
  it('deve rejeitar reserva quando o serviço de Usuários estiver indisponível', async () => {
    usuariosClient.buscarPorId.mockRejectedValue(
      new ServiceUnavailableException(
        'Não foi possível acessar o serviço de Usuários.',
      ),
    );

    await expect(service.validarDadosCriacao(dto)).rejects.toThrow(
      ServiceUnavailableException,
    );

    expect(quartosClient.buscarPorId).not.toHaveBeenCalled();
  });

  
it('deve rejeitar reserva quando o quarto não existir', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  quartosClient.buscarPorId.mockRejectedValue(
    new NotFoundException('Quarto não encontrado.'),
  );

  await expect(service.validarDadosCriacao(dto)).rejects.toThrow(
    NotFoundException,
  );
});

it('deve rejeitar reserva quando o quarto estiver inativo', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  quartosClient.buscarPorId.mockResolvedValue({
    ...quartoValido,
    status: 'INATIVO',
  });

  await expect(service.validarDadosCriacao(dto)).rejects.toThrow(
    BadRequestException,
  );
});

it('deve rejeitar reserva quando o quarto estiver indisponível', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  quartosClient.buscarPorId.mockResolvedValue({
    ...quartoValido,
    disponibilidade: 'INDISPONIVEL',
  });

  await expect(service.validarDadosCriacao(dto)).rejects.toThrow(
    BadRequestException,
  );
});

it('deve rejeitar reserva quando a capacidade do quarto for insuficiente', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  
quartosClient.buscarPorId.mockResolvedValue({
  ...quartoValido,
  tipo_quarto: {
    ...quartoValido.tipo_quarto,
    capacidade_maxima: 1,
  },
});


  await expect(service.validarDadosCriacao(dto)).rejects.toThrow(
    BadRequestException,
  );
});

it('deve rejeitar reserva quando o serviço de Quartos estiver indisponível', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  quartosClient.buscarPorId.mockRejectedValue(
    new ServiceUnavailableException(
      'Não foi possível acessar o serviço de Quartos.',
    ),
  );

  await expect(service.validarDadosCriacao(dto)).rejects.toThrow(
    ServiceUnavailableException,
  );
});


it('deve validar a disponibilidade quando não houver conflito de datas', async () => {
  // Simular usuários válidos.
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  // Simular ausência de conflitos no banco.
  disponibilidade.verificarDisponibilidade.mockResolvedValue(undefined);

  // Executar o fluxo completo de validação.
  const resultado = await service.validarDadosCriacao(dto);

  // Confirmar que a disponibilidade foi consultada.
  expect(disponibilidade.verificarDisponibilidade).toHaveBeenCalledTimes(1);

  expect(disponibilidade.verificarDisponibilidade).toHaveBeenCalledWith(
    BigInt(quartoValido.id),
    dto.dataPrevisaoCheckin,
    dto.dataPrevisaoCheckout,
  );

  // Confirmar que a validação foi concluída.
  expect(resultado.valido).toBe(true);
});


it('deve consultar a disponibilidade durante a validação inicial', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  const resultado = await service.validarDadosCriacao(dto);

  expect(resultado.valido).toBe(true);
  expect(resultado.quarto).toEqual(quartoValido);

  expect(
    disponibilidade.verificarDisponibilidade,
  ).toHaveBeenCalledTimes(1);

  expect(
    disponibilidade.verificarDisponibilidade,
  ).toHaveBeenCalledWith(
    BigInt(quartoValido.id),
    dto.dataPrevisaoCheckin,
    dto.dataPrevisaoCheckout,
  );
});

it('deve rejeitar a reserva quando houver conflito de disponibilidade', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  disponibilidade.verificarDisponibilidade.mockRejectedValue(
    new ConflictException(
      'O quarto já possui uma reserva para o período solicitado.',
    ),
  );

  await expect(
    service.validarDadosCriacao(dto),
  ).rejects.toThrow(ConflictException);

  expect(
    disponibilidade.verificarDisponibilidade,
  ).toHaveBeenCalledWith(
    BigInt(quartoValido.id),
    dto.dataPrevisaoCheckin,
    dto.dataPrevisaoCheckout,
  );
});


it('deve selecionar automaticamente um quarto pelo tipo solicitado', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  const dtoPorTipo: CriarReservaDto = {
    ...dto,
    quartoId: undefined,
    tipoQuartoId: '2',
  };

  const resultado = await service.validarDadosCriacao(dtoPorTipo);

  expect(resultado.valido).toBe(true);
  expect(resultado.quarto).toEqual(quartoValido);

  expect(quartosClient.selecionarQuartoDisponivel).toHaveBeenCalledWith(
    '2',
    dtoPorTipo.dataPrevisaoCheckin,
    dtoPorTipo.dataPrevisaoCheckout,
    2,
  );

  expect(quartosClient.buscarPorId).not.toHaveBeenCalled();

  expect(disponibilidade.verificarDisponibilidade).toHaveBeenCalledWith(
    1n,
    dtoPorTipo.dataPrevisaoCheckin,
    dtoPorTipo.dataPrevisaoCheckout,
  );
});

it('deve rejeitar reserva quando quartoId e tipoQuartoId forem informados juntos', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  const dtoComAmbos: CriarReservaDto = {
    ...dto,
    tipoQuartoId: '2',
  };

  await expect(
    service.validarDadosCriacao(dtoComAmbos),
  ).rejects.toThrow(BadRequestException);

  expect(quartosClient.buscarPorId).not.toHaveBeenCalled();
  expect(quartosClient.selecionarQuartoDisponivel).not.toHaveBeenCalled();
});

it('deve rejeitar reserva quando nenhum identificador de quarto for informado', async () => {
  usuariosClient.buscarPorId.mockImplementation(async (id: string) =>
    criarUsuario(id),
  );

  const dtoSemQuarto: CriarReservaDto = {
    ...dto,
    quartoId: undefined,
    tipoQuartoId: undefined,
  };

  await expect(
    service.validarDadosCriacao(dtoSemQuarto),
  ).rejects.toThrow(BadRequestException);

  expect(quartosClient.buscarPorId).not.toHaveBeenCalled();
  expect(quartosClient.selecionarQuartoDisponivel).not.toHaveBeenCalled();
});


});
