import { TicketCategory } from '@omjep/database';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsEnum(TicketCategory, {
    message: 'category doit être BUG, LITIGE ou COMPTE (enum Prisma).',
  })
  category!: TicketCategory;

  @IsString()
  @MinLength(10)
  @MaxLength(8000)
  message!: string;
}
