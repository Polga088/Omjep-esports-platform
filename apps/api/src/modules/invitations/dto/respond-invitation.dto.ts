import { IsIn } from 'class-validator';

export class RespondInvitationDto {
  @IsIn(['ACCEPTED', 'REJECTED'])
  status!: 'ACCEPTED' | 'REJECTED';
}
