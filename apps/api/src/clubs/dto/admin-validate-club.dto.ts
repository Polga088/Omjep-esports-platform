import { IsEnum } from 'class-validator';
import { ValidationStatus } from '@omjep/database';

export class AdminValidateClubDto {
  @IsEnum(ValidationStatus)
  validation_status!: ValidationStatus;
}
