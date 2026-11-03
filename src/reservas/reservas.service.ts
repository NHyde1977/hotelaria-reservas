import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarReservaDto } from './dto/criar-reserva.dto';
import { ReservasValidacaoService } from './reservas-validacao.service';
import { UsuariosClientService } from '../integracoes/usuarios/usuarios-client.service';
import { ReservasUsuariosValidacaoService } from './reservas-usuarios-validacao.service';
import { TipoHospede } from './dto/criar-hospede.dto';
import { QuartosClientService } from '../integracoes/quartos/quartos-client.service';
import { ReservasQuartosValidacaoService } from './reservas-quartos-validacao.service';
import { ReservasDisponibilidadeService } from './reservas-disponibilidade.service';

@Injectable()
export class ReservasService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly validacao: ReservasValidacaoService,
  private readonly usuariosClient: UsuariosClientService,
  private readonly usuariosValidacao: ReservasUsuariosValidacaoService,
  private readonly quartosClient: QuartosClientService,
  private readonly quartosValidacao: ReservasQuartosValidacaoService,
  private readonly disponibilidade: ReservasDisponibilidadeService,
) {}

  

async validarDadosCriacao(dto: CriarReservaDto) {
  // 1. Validar datas e composição dos hóspedes.
  this.validacao.validarCriacao(dto);

  // 2. Definir a data de referência para verificar a maioridade.
  const dataReferencia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // 3. Consultar e validar todos os hóspedes.
  for (const hospede of dto.hospedes) {
    const usuario = await this.usuariosClient.buscarPorId(
      hospede.usuarioId,
    );

    this.usuariosValidacao.validarSituacaoCadastral(usuario);

    if (hospede.tipo === TipoHospede.TITULAR) {
      this.usuariosValidacao.validarMaioridadeTitular(
        usuario,
        dataReferencia,
      );
    }
  }

  // 4. Consultar o quarto na API externa.
  const quarto = await this.quartosClient.buscarPorId(
    dto.quartoId,
  );

  // 5. Validar situação e capacidade do quarto.
  this.quartosValidacao.validarQuarto(
    quarto,
    dto.hospedes.length,
  );

  
  await this.disponibilidade.verificarDisponibilidade(
    BigInt(dto.quartoId),
    dto.dataPrevisaoCheckin,
    dto.dataPrevisaoCheckout,
  );


  // 6. Retornar o resultado das validações.
  return {
    valido: true,
    mensagem:
      'Validações locais, de usuários e de quarto realizadas com sucesso.',
  };
}



  async listarReservas() {
    return this.prisma.reserva.findMany({
      orderBy: {
        data_criacao: 'desc',
      },
    });
  }

  async buscarReservaPorId(id: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        hospede_reserva: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException(
        `Reserva com ID ${id} não encontrada.`,
      );
    }

    return reserva;
  }
}
