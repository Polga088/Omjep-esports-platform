import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(180)
  subject?: string

  @IsOptional()
  @IsString()
  @MaxLength(220)
  preheader?: string | null

  @IsOptional()
  @IsString()
  htmlContent?: string

  @IsOptional()
  @IsString()
  textContent?: string | null

  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

