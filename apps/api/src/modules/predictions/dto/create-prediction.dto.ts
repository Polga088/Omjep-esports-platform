import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CreatePredictionDto {
  @IsUUID()
  match_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  home_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  away_score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  bet_amount!: number;
}
