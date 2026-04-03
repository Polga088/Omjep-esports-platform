import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Planification récurrente pour championnats (jours fixes / plusieurs créneaux par jour).
 * Convention `match_weekdays` : 0 = dimanche … 6 = samedi (aligné sur `Date.getDay()`).
 */
export class LeagueRecurringScheduleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @Type(() => Number)
  match_weekdays!: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  @Type(() => Number)
  matches_per_day?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(24 * 60)
  @Type(() => Number)
  slot_gap_minutes?: number;

  /** Date de départ du calendrier (ISO). Défaut : date de début de la compétition. */
  @IsOptional()
  @IsDateString()
  anchor_date?: string;

  /** Premier coup d’envoi du jour, format HH:mm (fuseau serveur / local Node). */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'first_kickoff_time doit être au format HH:mm (ex. 20:30).',
  })
  first_kickoff_time?: string;
}

export class GenerateLeagueCalendarDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LeagueRecurringScheduleDto)
  league_schedule?: LeagueRecurringScheduleDto;
}
