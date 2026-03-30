import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsArray, IsUUID } from 'class-validator';

export class CreateCompetitionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(['LEAGUE', 'CUP'])
  type!: 'LEAGUE' | 'CUP';

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  team_ids?: string[];
}
