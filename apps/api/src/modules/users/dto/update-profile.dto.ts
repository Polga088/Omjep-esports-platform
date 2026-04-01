import { IsOptional, IsString, IsIn } from 'class-validator';

const POSITIONS = [
  'GK', 'DC', 'LAT', 'RAT', 'MDC', 'MOC', 'MG', 'MD', 'BU', 'ATT',
] as const;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  ea_persona_name?: string;

  @IsOptional()
  @IsIn(POSITIONS)
  preferred_position?: (typeof POSITIONS)[number];

  @IsOptional()
  @IsString()
  nationality?: string;
}
