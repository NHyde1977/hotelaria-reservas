import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Pagamento } from '../integracoes/pagamentos/pagamento.interface';

@Injectable()
export class ReservasPagamentosValidacaoService {
  permiteConfirmacao(
    pagamento: Pagamento,
    valorTotalReserva: string,
  ): boolean {
    if (pagamento.status !== 'APROVADO') {
      return false;
    }

    if (pagamento.tipo === 'SALDO') {
      return false;
    }

    if (pagamento.metodo !== 'CREDITO') {
      return false;
    }

    const valorPagamento = new Prisma.Decimal(pagamento.valor);
    const valorTotal = new Prisma.Decimal(valorTotalReserva);

    if (valorPagamento.lte(0) || valorTotal.lte(0)) {
      return false;
    }

    if (pagamento.tipo === 'TOTAL') {
      return valorPagamento.equals(valorTotal);
    }

    if (pagamento.tipo === 'SINAL') {
      const valorSinal = valorTotal
        .mul('0.30')
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      return valorPagamento.equals(valorSinal);
    }

    return false;
  }
}