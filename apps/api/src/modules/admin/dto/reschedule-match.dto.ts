import { IsDateString } from 'class-validator';

export class RescheduleMatchDto {
  @IsDateString()
  scheduled_at!: string;
}
