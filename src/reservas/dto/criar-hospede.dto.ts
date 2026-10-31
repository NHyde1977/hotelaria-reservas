
import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Identificador UUID v4 do usuário.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4')
  usuarioId!: string;

  @ApiProperty({
    description: 'Tipo de participação na reserva.',
    enum: TipoHospede,
    example: TipoHospede.TITULAR,
  })
  @IsEnum(TipoHospede)
  tipo!: TipoHospede;

  @ApiProperty({
    description: 'Indica se o hóspede está autorizado para check-in.',
    example: true,
  })
  @IsBoolean()
  autorizadoCheckin!: boolean;
}
