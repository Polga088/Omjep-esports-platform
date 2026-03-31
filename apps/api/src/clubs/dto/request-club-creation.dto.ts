import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Platform } from '@omjep/database';

export class RequestClubCreationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600_000)
  logo_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  proclubs_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ea_club_id?: string;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;
}
