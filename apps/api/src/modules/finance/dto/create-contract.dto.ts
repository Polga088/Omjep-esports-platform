import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { ContractStatus } from '@omjep/shared';

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
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
}
