import { IsEmail, IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @IsUUID()
  team_id!: string;

  @IsEmail()
  invitee_email!: string;
}
