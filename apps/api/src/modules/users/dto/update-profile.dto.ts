import { IsOptional, IsString, IsIn, IsUUID, ValidateIf } from 'class-validator';

const POSITIONS = [
  'GK', 'DC', 'LAT', 'RAT', 'MDC', 'MOC', 'MG', 'MD', 'BU', 'ATT',
] as const;

const AVATAR_RARITY_JSON = ['common', 'premium', 'legendary'] as const;

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

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  activeBannerUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  activeFrameUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  activeJerseyId?: string | null;

  @IsOptional()
  @IsIn(AVATAR_RARITY_JSON)
  avatarRarity?: (typeof AVATAR_RARITY_JSON)[number];
}
