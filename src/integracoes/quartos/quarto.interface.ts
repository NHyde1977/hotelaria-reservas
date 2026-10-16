export interface Quarto {
  id: number;
  status: 'ATIVO' | 'INATIVO';
  disponibilidade: 'DISPONIVEL' | 'INDISPONIVEL';
  tipo: {
    nome: string;
    capacidadeMaxima: number;
    precoDiaria: string;
  };
}
