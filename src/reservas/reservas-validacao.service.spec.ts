
import { BadRequestException } from '@nestjs/common';
import { ReservasValidacaoService } from './reservas-validacao.service';
import { CriarReservaDto } from './dto/criar-reserva.dto';
import { TipoHospede } from './dto/criar-hospede.dto';

describe('ReservasValidacaoService', () => {
  let service: ReservasValidacaoService;

  const titularId = '550e8400-e29b-41d4-a716-446655440000';
  const hospedeId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

  beforeEach(() => {
    service = new ReservasValidacaoService();
  });

  function criarDtoValido(): CriarReservaDto {
    const hoje = new Date();
    const checkin = new Date(hoje);
    const checkout = new Date(hoje);

    checkin.setDate(checkin.getDate() + 10);
    checkout.setDate(checkout.getDate() + 15);

    const formatarData = (data: Date) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };

    return {
      quartoId: 101,
      dataPrevisaoCheckin: formatarData(checkin),
      dataPrevisaoCheckout: formatarData(checkout),
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
  }

  it('deve aceitar dados locais válidos', () => {
    const dto = criarDtoValido();

    expect(() => service.validarCriacao(dto)).not.toThrow();
  });

  it('deve rejeitar check-in no passado', () => {
    const dto = criarDtoValido();
    dto.dataPrevisaoCheckin = '2020-01-01';

    expect(() => service.validarCriacao(dto))
      .toThrow(BadRequestException);
  });

  it('deve rejeitar check-out anterior ao check-in', () => {
    const dto = criarDtoValido();
    dto.dataPrevisaoCheckout = dto.dataPrevisaoCheckin;
    const data = new Date(`${dto.dataPrevisaoCheckout}T12:00:00`);
    data.setDate(data.getDate() - 1);

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    dto.dataPrevisaoCheckout = `${ano}-${mes}-${dia}`;

    expect(() => service.validarCriacao(dto))
      .toThrow(BadRequestException);
  });

  it('deve rejeitar check-out igual ao check-in', () => {
    const dto = criarDtoValido();
    dto.dataPrevisaoCheckout = dto.dataPrevisaoCheckin;

    expect(() => service.validarCriacao(dto))
      .toThrow(BadRequestException);
  });

  it('deve rejeitar reserva sem titular', () => {
    const dto = criarDtoValido();
    dto.hospedes[0].tipo = TipoHospede.HOSPEDE;

    expect(() => service.validarCriacao(dto))
      .toThrow(BadRequestException);
  });

  it('deve rejeitar reserva com dois titulares', () => {
    const dto = criarDtoValido();
    dto.hospedes[1].tipo = TipoHospede.TITULAR;

    expect(() => service.validarCriacao(dto))
      .toThrow(BadRequestException);
  });

  it('deve rejeitar usuário duplicado', () => {
    const dto = criarDtoValido();
    dto.hospedes[1].usuarioId = titularId;

    expect(() => service.validarCriacao(dto))
      .toThrow(BadRequestException);
  });

  it('deve rejeitar titular não autorizado para check-in', () => {
    const dto = criarDtoValido();
    dto.hospedes[0].autorizadoCheckin = false;

    expect(() => service.validarCriacao(dto))
      .toThrow(BadRequestException);
  });
});
