import { IsIn, IsOptional } from 'class-validator';

const STATUSES = ['OPEN', 'CLOSED', 'URGENT'] as const;

export class AdminPatchTicketDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
