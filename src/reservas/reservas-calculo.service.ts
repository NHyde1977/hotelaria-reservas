
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReservasCalculoService {
  calcularValorContratado(
    checkin: string,
    checkout: string,
    precoDiaria: string,
  ): {
    quantidadeNoites: number;
    valorDiaria: Prisma.Decimal;
    valorTotal: Prisma.Decimal;
  } {
    const dataCheckin = new Date(`${checkin}T00:00:00Z`);
    const dataCheckout = new Date(`${checkout}T00:00:00Z`);

    const diferencaMs =
      dataCheckout.getTime() - dataCheckin.getTime();

    const quantidadeNoites =
      diferencaMs / (1000 * 60 * 60 * 24);

    if (
      !Number.isInteger(quantidadeNoites) ||
      quantidadeNoites <= 0
    ) {
      throw new BadRequestException(
        'O período da reserva deve conter pelo menos uma noite.',
      );
    }

    let valorDiaria: Prisma.Decimal;

    try {
      valorDiaria = new Prisma.Decimal(precoDiaria);
    } catch {
      throw new BadRequestException(
        'O valor da diária informado pelo serviço de Quartos é inválido.',
      );
    }

    if (!valorDiaria.isFinite() || valorDiaria.lte(0)) {
      throw new BadRequestException(
        'O valor da diária deve ser maior que zero.',
      );
    }

    
const valorMaximo = new Prisma.Decimal('99999999.99');

if (valorDiaria.decimalPlaces() > 2) {
  throw new BadRequestException(
    'O valor da diária não pode possuir mais de duas casas decimais.',
  );
}

if (valorDiaria.gt(valorMaximo)) {
  throw new BadRequestException(
    'O valor da diária excede o limite permitido.',
  );
}

const valorTotal = valorDiaria.mul(quantidadeNoites);

if (valorTotal.gt(valorMaximo)) {
  throw new BadRequestException(
    'O valor total da reserva excede o limite permitido.',
  );
}

    return {
      quantidadeNoites,
      valorDiaria,
      valorTotal,
    };
  }
}
