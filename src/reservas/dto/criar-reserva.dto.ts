
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
  @IsInt()
  @Min(1)
  quartoId: number;

  @IsDateString()
  dataPrevisaoCheckin: string;

  @IsDateString()
  dataPrevisaoCheckout: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CriarHospedeDto)
  hospedes: CriarHospedeDto[];
}
