import { IsOptional, IsDateString, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateModeratorMatchDto {
  @IsUUID()
  home_team_id!: string;

  @IsUUID()
  away_team_id!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  round?: string;

  /** Date/heure de coup d’envoi (stockée dans `scheduled_at` / `startTime`). */
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}
