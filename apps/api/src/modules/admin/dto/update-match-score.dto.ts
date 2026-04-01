import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMatchScoreDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  home_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  away_score!: number;
}
