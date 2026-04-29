import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { Platform } from '@omjep/shared'

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export class UpdateManagedClubDto {
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
}
