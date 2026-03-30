import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class SubmitScoreReportDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  home_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  away_score!: number;
}
