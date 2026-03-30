import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';

const POSITIONS = [
  'GK', 'DC', 'LAT', 'RAT', 'MDC', 'MOC', 'MG', 'MD', 'BU', 'ATT',
] as const;
const USER_ROLES = ['ADMIN', 'MODERATOR', 'MANAGER', 'PLAYER'] as const;

export class AdminCreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

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
}
