export interface Usuario {
  id: string;
  nome: string;
  dataNascimento: string;
  status: 'ATIVO' | 'INATIVO';
  roles: string[];
}
