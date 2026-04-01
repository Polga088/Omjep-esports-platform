import { IsInt, Min, IsOptional, Allow } from 'class-validator';

export class AdminStorePlanPatchDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  priceJepy?: number;

  /** Tableau de chaînes ou objet JSON (avantages affichés en boutique). */
  @IsOptional()
  @Allow()
  features?: unknown;
}
