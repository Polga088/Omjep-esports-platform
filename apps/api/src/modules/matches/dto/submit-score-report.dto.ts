import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class SubmitScoreReportDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  home_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  away_score!: number;

  @IsString()
  @IsOptional()
  @MaxLength(4096)
  proof_url?: string;
}
