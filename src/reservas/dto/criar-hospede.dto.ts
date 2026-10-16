
import {
  IsBoolean,
  IsEnum,
  IsUUID,
} from 'class-validator';

export enum TipoHospede {
  TITULAR = 'TITULAR',
  HOSPEDE = 'HOSPEDE',
}

export class CriarHospedeDto {
  @IsUUID('4')
  usuarioId: string;

  @IsEnum(TipoHospede)
  tipo: TipoHospede;

  @IsBoolean()
  autorizadoCheckin: boolean;
}
