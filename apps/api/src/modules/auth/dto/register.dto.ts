import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';

const POSITIONS = ['GK', 'DC', 'LAT', 'RAT', 'MDC', 'MOC', 'MG', 'MD', 'BU', 'ATT'] as const;
const PLATFORMS = ['CROSSPLAY', 'PS5', 'XBOX', 'PC'] as const;
const ROLES = ['PLAYER', 'MANAGER', 'ADMIN'] as const; // <-- On définit les rôles autorisés

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  ea_persona_name?: string;

  @IsOptional() // <-- AJOUTÉ : Pour autoriser le choix "Manager" du frontend
  @IsIn(ROLES)
  role?: (typeof ROLES)[number];

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
  @IsIn(PLATFORMS)
  platform?: (typeof PLATFORMS)[number];
}