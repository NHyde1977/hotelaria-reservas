export interface Pagamento {
  id: string;
  reserva_id: string;
  valor: string;
  tipo: 'SINAL' | 'TOTAL' | 'SALDO';
  metodo: 'CREDITO' | 'DEBITO' | 'PIX' | 'DINHEIRO';
  status:
    | 'PENDENTE'
    | 'APROVADO'
    | 'RECUSADO'
    | 'CANCELADO'
    | 'ESTORNADO';
  data_pagamento: string;
}