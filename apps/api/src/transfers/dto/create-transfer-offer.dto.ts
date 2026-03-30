import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateTransferOfferDto {
  @IsUUID()
  player_id!: string;

  @IsUUID()
  from_team_id!: string;

  @IsUUID()
  to_team_id!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;
}
