import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MatchStatus } from '@omjep/database';

export class UpdateAdminMatchDto {
  @IsOptional()
  @IsUUID()
  competition_id?: string;

  @IsOptional()
  @IsUUID()
  home_team_id?: string;

  @IsOptional()
  @IsUUID()
  away_team_id?: string;

  @IsOptional()
  @IsString()
  round?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string | null;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  home_score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  away_score?: number;

  @IsOptional()
  @IsDateString()
  played_at?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bracket_round?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bracket_index?: number | null;
}
