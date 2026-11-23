
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsString,
  Matches,
} from 'class-validator';

export class ConsultarDisponibilidadeDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[1-9]\d*$/, { each: true })
  quartoIds: string[];

  @IsDateString()
  checkin: string;

  @IsDateString()
  checkout: string;
}
