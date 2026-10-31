
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CriarHospedeDto } from './criar-hospede.dto';

export class CriarReservaDto {
  @ApiProperty({
    description: 'Identificador do quarto.',
    example: 101,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  quartoId!: number;

  @ApiProperty({
    description: 'Data prevista para entrada, no formato YYYY-MM-DD.',
    example: '2026-11-15',
    format: 'date',
  })
  @IsDateString()
  dataPrevisaoCheckin!: string;

  @ApiProperty({
    description: 'Data prevista para saída, no formato YYYY-MM-DD.',
    example: '2026-11-20',
    format: 'date',
  })
  @IsDateString()
  dataPrevisaoCheckout!: string;

  @ApiProperty({
    description: 'Lista de hóspedes associados à reserva.',
    type: () => CriarHospedeDto,
    isArray: true,
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CriarHospedeDto)
  hospedes!: CriarHospedeDto[];
}
