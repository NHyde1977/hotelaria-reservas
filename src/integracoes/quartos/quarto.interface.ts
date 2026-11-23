
export interface Quarto {
  id: string;
  id_tipo_quarto: string;
  numero: number;
  status: 'ATIVO' | 'INATIVO';
  disponibilidade: 'DISPONIVEL' | 'INDISPONIVEL';
  tipo_quarto: {
    id: string;
    nome: string;
    capacidade_maxima: number;
    preco_diaria: string;
  };
}
