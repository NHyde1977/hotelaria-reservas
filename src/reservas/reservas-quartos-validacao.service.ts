
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { Quarto } from '../integracoes/quartos/quarto.interface';

@Injectable()
export class ReservasQuartosValidacaoService {
  validarQuarto(quarto: Quarto, quantidadeHospedes: number): void {
    if (quarto.status !== 'ATIVO') {
      throw new BadRequestException(
        'O quarto informado não está ativo.',
      );
    }

    if (quarto.disponibilidade !== 'DISPONIVEL') {
      throw new BadRequestException(
        'O quarto informado não está disponível.',
      );
    }

    if (quantidadeHospedes > quarto.tipo.capacidadeMaxima) {
      throw new BadRequestException(
        'A quantidade de hóspedes excede a capacidade máxima do quarto.',
      );
    }
  }
}
