import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateCompetitionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(['LEAGUE', 'CUP', 'CHAMPIONS'])
  type!: 'LEAGUE' | 'CUP' | 'CHAMPIONS';

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  team_ids?: string[];
}
