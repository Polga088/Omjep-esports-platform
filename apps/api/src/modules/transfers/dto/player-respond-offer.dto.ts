import { IsIn, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class PlayerRespondOfferDto {
  @IsIn(['ACCEPT', 'REJECT', 'COUNTER'])
  action!: 'ACCEPT' | 'REJECT' | 'COUNTER';

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
}
