import { IsArray, IsNotEmpty, IsUUID, ArrayMinSize } from 'class-validator';

export class GenerateBracketDto {
  @IsUUID('4')
  @IsNotEmpty()
  competition_id!: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  team_ids!: string[];
}
