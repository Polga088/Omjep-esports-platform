import { IsInt, IsNumber, IsPositive, IsUUID, Min, Max } from 'class-validator';

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

  /** Salaire annuel proposé au joueur */
  @IsNumber()
  @IsPositive()
  offered_salary!: number;

  /** Clause libératoire du futur contrat */
  @IsNumber()
  @IsPositive()
  offered_clause!: number;

  /** Durée du contrat en mois */
  @IsInt()
  @Min(1)
  @Max(60)
  duration_months!: number;
}
