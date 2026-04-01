import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class BuyerRespondOfferDto {
  @IsIn(['ACCEPT_COUNTER', 'REJECT', 'REVISE'])
  action!: 'ACCEPT_COUNTER' | 'REJECT' | 'REVISE';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  transfer_fee?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  offered_salary?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  offered_clause?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  duration_months?: number;
}
