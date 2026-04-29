import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { Platform, ValidationStatus } from '@omjep/shared'

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export class UpdateAdminClubDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'primaryColor must be a valid hex color.' })
  primaryColor?: string

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, { message: 'secondaryColor must be a valid hex color.' })
  secondaryColor?: string

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  proclubs_url?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  prestige_level?: number

  @IsOptional()
  @IsEnum(ValidationStatus)
  validation_status?: ValidationStatus

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logo_url?: string
}
