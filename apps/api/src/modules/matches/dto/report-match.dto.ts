import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class ReportMatchDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  homeScore!: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  awayScore!: number

  @IsString()
  @IsOptional()
  @MaxLength(4096)
  proofUrl?: string
}
