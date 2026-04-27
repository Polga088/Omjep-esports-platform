import { Type } from 'class-transformer'
import { IsInt, IsOptional, Min } from 'class-validator'

export class ConfirmMatchDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  homeScore?: number

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  awayScore?: number
}
