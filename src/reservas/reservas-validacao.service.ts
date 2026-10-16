
import { BadRequestException, Injectable } from '@nestjs/common';
import { CriarReservaDto } from './dto/criar-reserva.dto';
import { TipoHospede } from './dto/criar-hospede.dto';

@Injectable()
export class ReservasValidacaoService {
  validarCriacao(dto: CriarReservaDto): void {
    this.validarPeriodo(dto);
    this.validarHospedes(dto);
  }

  private validarPeriodo(dto: CriarReservaDto): void {
    const checkin = dto.dataPrevisaoCheckin;
    const checkout = dto.dataPrevisaoCheckout;

    const hoje = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        }).format(new Date());

    if (checkin < hoje) {
      throw new BadRequestException(
        'A data de check-in não pode estar no passado.',
      );
    }

    if (checkout <= checkin) {
      throw new BadRequestException(
        'A data de check-out deve ser posterior ao check-in.',
      );
    }
  }

  private validarHospedes(dto: CriarReservaDto): void {
    const titulares = dto.hospedes.filter(
      (hospede) => hospede.tipo === TipoHospede.TITULAR,
    );

    if (titulares.length !== 1) {
      throw new BadRequestException(
        'A reserva deve possuir exatamente um titular.',
      );
    }

    const ids = dto.hospedes.map((hospede) => hospede.usuarioId);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'Um usuário não pode aparecer mais de uma vez na mesma reserva.',
      );
    }

    if (!titulares[0].autorizadoCheckin) {
      throw new BadRequestException(
        'O titular deve estar autorizado para check-in.',
      );
    }
  }
}
