import {
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export type GrantCurrency = 'OC' | 'JEPY';

export class AdminGrantCoinsDto {
  @IsUUID('4')
  userId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  amount!: number;

  @IsIn(['OC', 'JEPY'])
  currency!: GrantCurrency;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
