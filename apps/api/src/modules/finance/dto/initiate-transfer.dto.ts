import { IsUUID } from 'class-validator';

export class InitiateTransferDto {
  @IsUUID()
  buying_team_id!: string;

  @IsUUID()
  player_id!: string;
}
