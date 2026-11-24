import {
  IsUUID,
  IsIn,
  IsDecimal,
  IsISO8601,
  IsDefined,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DadosPagamentoAprovadoDto {
  @IsUUID()
  pagamento_id!: string;

  @IsUUID()
  reserva_id!: string;

  @IsDecimal({ decimal_digits: '0,2' })
  valor!: string;

  @IsIn(['SINAL', 'TOTAL', 'SALDO'])
  tipo!: 'SINAL' | 'TOTAL' | 'SALDO';

  @IsIn(['CREDITO', 'DEBITO', 'PIX', 'DINHEIRO'])
  metodo!: 'CREDITO' | 'DEBITO' | 'PIX' | 'DINHEIRO';

  @IsIn(['APROVADO'])
  status!: 'APROVADO';
}

export class PagamentoEventoDto {
  @IsIn(['pagamento.aprovado'])
  evento!: 'pagamento.aprovado';

  @IsDefined()
  @ValidateNested()
  @Type(() => DadosPagamentoAprovadoDto)
  dados!: DadosPagamentoAprovadoDto;

  @IsISO8601()
  data_hora!: string;
}