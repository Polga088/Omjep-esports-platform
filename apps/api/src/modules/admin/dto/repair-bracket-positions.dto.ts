import { IsNotEmpty, IsUUID } from 'class-validator';

export class RepairBracketPositionsDto {
  @IsUUID('4')
  @IsNotEmpty()
  competition_id!: string;
}
