import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Montant d’OMJEP Coins à convertir (multiple de 1000, min 1000). */
export class ExchangeWalletDto {
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(999_999_999)
  oc_amount!: number;
}
