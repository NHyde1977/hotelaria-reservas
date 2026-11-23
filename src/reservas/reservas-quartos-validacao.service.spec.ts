
import { BadRequestException } from '@nestjs/common';
import { Quarto } from '../integracoes/quartos/quarto.interface';
import { ReservasQuartosValidacaoService } from './reservas-quartos-validacao.service';

describe('ReservasQuartosValidacaoService', () => {
  let service: ReservasQuartosValidacaoService;

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


  beforeEach(() => {
    service = new ReservasQuartosValidacaoService();
  });

  it('deve aceitar quarto ativo, disponível e com capacidade suficiente', () => {
    expect(() =>
      service.validarQuarto(quartoValido, 2),
    ).not.toThrow();
  });

  it('deve rejeitar quarto inativo', () => {
    const quarto: Quarto = {
      ...quartoValido,
      status: 'INATIVO',
    };

    expect(() =>
      service.validarQuarto(quarto, 2),
    ).toThrow(BadRequestException);
  });

  it('deve rejeitar quarto indisponível', () => {
    const quarto: Quarto = {
      ...quartoValido,
      disponibilidade: 'INDISPONIVEL',
    };

    expect(() =>
      service.validarQuarto(quarto, 2),
    ).toThrow(BadRequestException);
  });

  it('deve rejeitar quantidade de hóspedes superior à capacidade', () => {
    expect(() =>
      service.validarQuarto(quartoValido, 3),
    ).toThrow(BadRequestException);
  });

  it('deve aceitar quantidade de hóspedes inferior à capacidade', () => {
    expect(() =>
      service.validarQuarto(quartoValido, 1),
    ).not.toThrow();
  });
});
