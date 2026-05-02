import {
  Allow,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { TransferMode } from '@omjep/database';

export class CreateTransferOfferDto {
  @IsUUID()
  player_id!: string;

  @IsUUID()
  from_team_id!: string;

  /** Club vendeur — optionnel ; absent / null = recrutement direct (sans vendeur) */
  @IsOptional()
  @Allow()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUUID()
  to_team_id?: string | null;

  /** Indemnité (négocié) ou montant de clause payé au vendeur si `transfer_mode = RELEASE_CLAUSE_BUYOUT` */
  @IsNumber()
  @Min(0)
  transfer_fee!: number;

  /** Mercato V2 Phase D — défaut : négociation classique (règlement vendeur fin de saison). */
  @IsOptional()
  @IsEnum(TransferMode)
  transfer_mode?: TransferMode;

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

  /** Durée cible du contrat en saisons (V2). Défaut : dérivé de `duration_months` si absent. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  seasons_count?: number;

  /** Saison de début du contrat proposé (V2). Défaut : saison `is_current` si présente. */
  @IsOptional()
  @IsUUID()
  contract_start_season_id?: string;
}
