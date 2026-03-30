import { IsDateString, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateContractDto {
  @IsUUID()
  team_id!: string;

  @IsUUID()
  user_id!: string;

  @IsNumber()
  @IsPositive()
  salary!: number;

  @IsNumber()
  @IsPositive()
  release_clause!: number;

  @IsDateString()
  expires_at!: string;
}
