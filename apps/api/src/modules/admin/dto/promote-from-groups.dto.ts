import { IsNotEmpty, IsUUID } from 'class-validator';

export class PromoteFromGroupsDto {
  @IsUUID('4')
  @IsNotEmpty()
  competition_id!: string;
}
