import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator'

export class TestEmailTemplateDto {
  @IsEmail()
  to!: string

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>

  @IsOptional()
  @IsString()
  subjectPrefix?: string
}

