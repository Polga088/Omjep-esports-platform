import { IsOptional, IsString, IsIn } from 'class-validator';

const POSITIONS = ['GK', 'DC', 'LAT', 'RAT', 'MDC', 'MOC', 'MG', 'MD', 'BU', 'ATT'] as const;

export class OnboardingDto {
  @IsOptional()
  @IsIn(POSITIONS)
  preferred_position?: (typeof POSITIONS)[number];

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  gamertag_psn?: string;

  @IsOptional()
  @IsString()
  gamertag_xbox?: string;
}
