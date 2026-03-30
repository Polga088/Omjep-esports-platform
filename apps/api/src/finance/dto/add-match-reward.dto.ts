import { IsIn, IsUUID } from 'class-validator';

export class AddMatchRewardDto {
  @IsUUID()
  team_id!: string;

  @IsIn(['W', 'D', 'L'])
  result!: 'W' | 'D' | 'L';
}
