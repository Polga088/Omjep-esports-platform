import { IsUUID } from 'class-validator';

export class AddCompetitionTeamDto {
  @IsUUID('4')
  team_id!: string;
}
