import { IsEnum } from 'class-validator';
import { ValidationStatus } from '@omjep/shared';

export class AdminValidateClubDto {
  @IsEnum(ValidationStatus)
  validation_status!: ValidationStatus;
}
