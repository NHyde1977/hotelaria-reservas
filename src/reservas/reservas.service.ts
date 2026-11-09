import { randomUUID } from 'node:crypto';
import { Prisma, reserva_status } from '@prisma/client';
import { Quarto } from '../integracoes/quartos/quarto.interface';
import { ReservasCalculoService } from './reservas-calculo.service';
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
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
  private readonly calculo: ReservasCalculoService,
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


prepararDadosCriacao(
  dto: CriarReservaDto,
  quarto: Quarto,
): Prisma.reservaCreateInput {
  const valores = this.calculo.calcularValorContratado(
    dto.dataPrevisaoCheckin,
    dto.dataPrevisaoCheckout,
    quarto.tipo.precoDiaria,
  );

  return {
    id: randomUUID(),
    quarto_id: BigInt(dto.quartoId),

    data_previsao_checkin: new Date(
      `${dto.dataPrevisaoCheckin}T00:00:00Z`,
    ),

    data_previsao_checkout: new Date(
      `${dto.dataPrevisaoCheckout}T00:00:00Z`,
    ),

    status: reserva_status.PENDENTE_PAGAMENTO,

    valor_diaria_contratada: valores.valorDiaria,
    valor_total_contratado: valores.valorTotal,

    hospede_reserva: {
      create: dto.hospedes.map((hospede) => ({
        id: randomUUID(),
        usuario_id: hospede.usuarioId,
        tipo: hospede.tipo,
        autorizado_checkin: hospede.autorizadoCheckin,
      })),
    },
  };
}



async persistirReservaValidada(
  dto: CriarReservaDto,
  quarto: Quarto,
) {
  const dados = this.prepararDadosCriacao(dto, quarto);

  const maxTentativas = 3;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await this.disponibilidade.verificarDisponibilidade(
            BigInt(dto.quartoId),
            dto.dataPrevisaoCheckin,
            dto.dataPrevisaoCheckout,
            undefined,
            tx,
          );

          return tx.reserva.create({
            data: dados,
            include: {
              hospede_reserva: true,
            },
          });
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (erro) {
      const erroConcorrencia =
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2034';

      if (!erroConcorrencia) {
  throw erro;
}

if (tentativa === maxTentativas) {
  throw new ServiceUnavailableException(
    'Não foi possível concluir a reserva devido a conflitos simultâneos. Tente novamente.',
  );
}
    }
  }

  throw new Error('Não foi possível concluir a transação.');
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
