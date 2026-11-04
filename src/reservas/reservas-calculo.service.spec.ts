
import { BadRequestException } from '@nestjs/common';
import { ReservasCalculoService } from './reservas-calculo.service';

describe('ReservasCalculoService', () => {
  let service: ReservasCalculoService;

  beforeEach(() => {
    service = new ReservasCalculoService();
  });

  it('deve calcular corretamente uma hospedagem de três noites', () => {
    const resultado = service.calcularValorContratado(
      '2026-12-10',
      '2026-12-13',
      '350.00',
    );

    expect(resultado.quantidadeNoites).toBe(3);
    expect(resultado.valorDiaria.toFixed(2)).toBe('350.00');
    expect(resultado.valorTotal.toFixed(2)).toBe('1050.00');
  });

  it('deve calcular corretamente uma hospedagem de uma noite', () => {
    const resultado = service.calcularValorContratado(
      '2026-12-10',
      '2026-12-11',
      '250.50',
    );

    expect(resultado.quantidadeNoites).toBe(1);
    expect(resultado.valorTotal.toFixed(2)).toBe('250.50');
  });

  it('deve calcular corretamente um período que atravessa o mês', () => {
    const resultado = service.calcularValorContratado(
      '2026-11-29',
      '2026-12-02',
      '199.90',
    );

    expect(resultado.quantidadeNoites).toBe(3);
    expect(resultado.valorTotal.toFixed(2)).toBe('599.70');
  });

  it('deve rejeitar checkout igual ao check-in', () => {
    expect(() =>
      service.calcularValorContratado(
        '2026-12-10',
        '2026-12-10',
        '350.00',
      ),
    ).toThrow(BadRequestException);
  });

  it('deve rejeitar checkout anterior ao check-in', () => {
    expect(() =>
      service.calcularValorContratado(
        '2026-12-13',
        '2026-12-10',
        '350.00',
      ),
    ).toThrow(BadRequestException);
  });

  it('deve rejeitar diária com valor zero', () => {
    expect(() =>
      service.calcularValorContratado(
        '2026-12-10',
        '2026-12-13',
        '0',
      ),
    ).toThrow(BadRequestException);
  });

  it('deve rejeitar diária negativa', () => {
    expect(() =>
      service.calcularValorContratado(
        '2026-12-10',
        '2026-12-13',
        '-100.00',
      ),
    ).toThrow(BadRequestException);
  });

  it('deve rejeitar diária com formato inválido', () => {
    expect(() =>
      service.calcularValorContratado(
        '2026-12-10',
        '2026-12-13',
        'valor-invalido',
      ),
    ).toThrow(BadRequestException);
  });

  
it('deve rejeitar diária com mais de duas casas decimais', () => {
  expect(() =>
    service.calcularValorContratado(
      '2026-12-10',
      '2026-12-13',
      '350.999',
    ),
  ).toThrow(BadRequestException);
});

it('deve rejeitar diária acima do limite do banco', () => {
  expect(() =>
    service.calcularValorContratado(
      '2026-12-10',
      '2026-12-13',
      '100000000.00',
    ),
  ).toThrow(BadRequestException);
});

it('deve rejeitar valor total acima do limite do banco', () => {
  expect(() =>
    service.calcularValorContratado(
      '2026-12-10',
      '2026-12-13',
      '40000000.00',
    ),
  ).toThrow(BadRequestException);
});

});
