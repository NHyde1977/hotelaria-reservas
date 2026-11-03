
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Usuario } from '../integracoes/usuarios/usuario.interface';

@Injectable()
export class ReservasUsuariosValidacaoService {
  validarMaioridadeTitular(
    usuario: Usuario,
    dataReferencia: string,
  ): void {
    const nascimento = usuario.dataNascimento;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) {
      throw new BadRequestException(
        'Data de nascimento do titular inválida.',
      );
    }

    const [ano, mes, dia] = nascimento.split('-').map(Number);
    const [anoRef, mesRef, diaRef] = dataReferencia
      .split('-')
      .map(Number);

    const dataValida = new Date(Date.UTC(ano, mes - 1, dia));

    if (
      dataValida.getUTCFullYear() !== ano ||
      dataValida.getUTCMonth() !== mes - 1 ||
      dataValida.getUTCDate() !== dia
    ) {
      throw new BadRequestException(
        'Data de nascimento do titular inválida.',
      );
    }

    let idade = anoRef - ano;

    if (
      mesRef < mes ||
      (mesRef === mes && diaRef < dia)
    ) {
      idade--;
    }

    if (idade < 18) {
      throw new BadRequestException(
        'O titular da reserva deve ter pelo menos 18 anos.',
      );
    }
  }

  
validarSituacaoCadastral(usuario: Usuario): void {
  if (usuario.status !== 'ATIVO') {
    throw new BadRequestException(
      `O usuário ${usuario.id} não possui cadastro ativo.`,
    );
  }
}

}
