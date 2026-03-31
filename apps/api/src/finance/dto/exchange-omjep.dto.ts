import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Quantité de JEPY à obtenir (coût : 1000 OMJEP par JEPY). */
export class ExchangeOmjepDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jepy_amount!: number;
}
