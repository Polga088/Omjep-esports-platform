import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const POSITIONS = [
  'GK', 'DC', 'LAT', 'RAT', 'MDC', 'MOC', 'MG', 'MD', 'BU', 'ATT',
] as const;
const USER_ROLES = ['ADMIN', 'MODERATOR', 'MANAGER', 'PLAYER'] as const;

export class AdminUpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: (typeof USER_ROLES)[number];

  @IsOptional()
  @IsString()
  ea_persona_name?: string;

  @IsOptional()
  @IsString()
  gamertag_psn?: string;

  @IsOptional()
  @IsString()
  gamertag_xbox?: string;

  @IsOptional()
  @IsIn(POSITIONS)
  preferred_position?: (typeof POSITIONS)[number];

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  xp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level?: number;
}
