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

export class CreateAdminMatchDto {
  @IsUUID()
  competition_id!: string;

  @IsUUID()
  home_team_id!: string;

  @IsUUID()
  away_team_id!: string;

  @IsOptional()
  @IsString()
  round?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bracket_round?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bracket_index?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVisible?: boolean;
}
