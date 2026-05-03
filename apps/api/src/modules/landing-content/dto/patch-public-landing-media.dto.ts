import { IsObject, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator'

export class PatchPublicLandingMediaDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(2048)
  palmaresHeroVisualUrl?: string | null

  @IsOptional()
  @IsObject()
  palmaresCompetitionsMedia?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  palmaresChampionsMedia?: Record<string, unknown>
}
