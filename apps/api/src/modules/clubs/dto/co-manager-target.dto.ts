import { IsUUID } from 'class-validator';

/** Cible joueur pour promotion / destitution co-manager. */
export class CoManagerTargetDto {
  @IsUUID('4')
  target_user_id!: string;
}
