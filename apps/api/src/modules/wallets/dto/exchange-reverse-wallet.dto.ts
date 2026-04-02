import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Quantité de Jepy à convertir en OC (minimum 1). */
export class ExchangeReverseWalletDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999_999_999)
  jepy_amount!: number;
}
