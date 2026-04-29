import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { CompetitionStatus, CupScenario } from '@omjep/database';

export class UpdateCompetitionDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Le nom ne peut pas être vide.' })
  name?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsEnum(CupScenario)
  cup_scenario?: CupScenario;

  @IsOptional()
  @IsEnum(CompetitionStatus)
  status?: CompetitionStatus;
}
