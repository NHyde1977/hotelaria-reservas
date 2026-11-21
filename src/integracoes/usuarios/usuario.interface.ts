export interface Usuario {
  id: string;
  nome: string;
  dataNascimento: string;
  status: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  roles: string[];
}

export interface UsuarioApiResponse {
  id: string;
  nome: string;
  data_nascimento: string;
  status: 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
  roles?: string[];
}