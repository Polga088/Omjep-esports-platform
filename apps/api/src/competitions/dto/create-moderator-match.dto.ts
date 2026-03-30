import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateModeratorMatchDto {
  @IsUUID()
  home_team_id!: string;

  @IsUUID()
  away_team_id!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  round?: string;
}
