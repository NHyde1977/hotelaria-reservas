
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CriarHospedeDto } from './criar-hospede.dto';

export class CriarReservaDto {
  @ApiPropertyOptional({
    description:
      'ID do quarto físico. Informe quartoId ou tipoQuartoId, nunca ambos.',
    example: '101',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/)
  quartoId?: string;

  @ApiPropertyOptional({
    description:
      'ID do tipo de quarto. O sistema selecionará um quarto disponível.',
    example: '3',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/)
  tipoQuartoId?: string;

  @ApiProperty({
    description: 'Data prevista para entrada, no formato YYYY-MM-DD.',
    example: '2027-01-10',
    format: 'date',
  })
  @IsDateString()
  dataPrevisaoCheckin!: string;

  @ApiProperty({
    description: 'Data prevista para saída, no formato YYYY-MM-DD.',
    example: '2027-01-13',
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
