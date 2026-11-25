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

  permiteFinalizacao(
  pagamentos: Pagamento[],
  valorTotalReserva: string,
): boolean {
  const valorTotal = new Prisma.Decimal(valorTotalReserva);

  if (valorTotal.lte(0)) {
    return false;
  }

  const pagamentosAprovados = pagamentos.filter(
    (pagamento) => pagamento.status === 'APROVADO',
  );

  const possuiTotal = pagamentosAprovados.some(
    (pagamento) =>
      pagamento.tipo === 'TOTAL' &&
      this.permiteConfirmacao(pagamento, valorTotalReserva),
  );

  if (possuiTotal) {
    return true;
  }

  const valorSinal = valorTotal
    .mul('0.30')
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  const valorSaldo = valorTotal.minus(valorSinal);

  const possuiSinal = pagamentosAprovados.some(
    (pagamento) =>
      pagamento.tipo === 'SINAL' &&
      this.permiteConfirmacao(pagamento, valorTotalReserva),
  );

  const possuiSaldo = pagamentosAprovados.some(
    (pagamento) =>
      pagamento.tipo === 'SALDO' &&
      new Prisma.Decimal(pagamento.valor).gt(0) &&
      new Prisma.Decimal(pagamento.valor).equals(valorSaldo),
  );

  return possuiSinal && possuiSaldo;
}
}