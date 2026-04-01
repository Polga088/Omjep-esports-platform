import { IsInt, IsNumber, IsOptional, IsPositive, IsUUID, Min, Max } from 'class-validator';

export class CreateTransferOfferDto {
  @IsUUID()
  player_id!: string;

  @IsUUID()
  from_team_id!: string;

  @IsUUID()
  to_team_id!: string;

  /** Indemnité versée au club vendeur (OMJEP Coins) */
  @IsNumber()
  @IsPositive()
  transfer_fee!: number;

  /** Salaire annuel proposé au joueur (OC) — si absent, utiliser `salaryPropose` (hebdo × 52) */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  offered_salary?: number;

  /** Clause libératoire du futur contrat (OC) — si absent, utiliser `releaseClausePropose` */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  offered_clause?: number;

  /** Salaire hebdomadaire proposé (OC) — stocké en annuel via × 52 */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryPropose?: number;

  /** Clause libératoire proposée (OC) — alias de `offered_clause` */
  @IsOptional()
  @IsNumber()
  @IsPositive()
  releaseClausePropose?: number;

  /** Durée du contrat en mois */
  @IsInt()
  @Min(1)
  @Max(60)
  duration_months!: number;
}
