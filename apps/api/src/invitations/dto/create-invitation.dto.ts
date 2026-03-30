import { IsEmail, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class CreateInvitationDto {
  @IsUUID()
  team_id!: string;

  @IsOptional()
  @IsEmail()
  invitee_email?: string;

  @IsOptional()
  @IsString()
  ea_persona_name?: string;

  @ValidateIf((o) => !o.invitee_email && !o.ea_persona_name)
  @IsString({ message: 'Vous devez fournir un email ou un pseudo EA FC.' })
  _atLeastOne?: string;
}
