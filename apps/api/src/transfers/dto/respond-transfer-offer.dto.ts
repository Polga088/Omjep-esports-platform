import { IsIn } from 'class-validator';

export class RespondTransferOfferDto {
  @IsIn(['ACCEPTED', 'REJECTED'])
  status!: 'ACCEPTED' | 'REJECTED';
}
