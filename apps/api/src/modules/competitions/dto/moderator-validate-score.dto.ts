import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { EventType } from '@omjep/shared';

export class ModeratorScoreEventDto {
  @IsUUID()
  player_id!: string;

  @IsOptional()
  @IsUUID()
  team_id?: string;

  @IsEnum(EventType)
  type!: EventType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minute?: number;
}

export class ModeratorValidateScoreDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModeratorScoreEventDto)
  events?: ModeratorScoreEventDto[];
}
