import { SetMetadata, applyDecorators } from '@nestjs/common';
import type { ClubRole } from '@omjep/database';

/** Contexte pour résoudre l’équipe : body `team_id` (invitations) ou `match` via `:id` (score). */
export type ClubRolesGuardMode = 'invitation_body' | 'match_param';

export const CLUB_ROLES_KEY = 'club_roles';
export const CLUB_ROLES_MODE_KEY = 'club_roles_mode';

/**
 * Accès réservé aux rôles club listés (ex. MANAGER + CO_MANAGER).
 * À utiliser avec {@link ClubRolesGuard} après {@link JwtAuthGuard}.
 *
 * @example
 * @ClubRoles('match_param', ClubRole.FOUNDER, ClubRole.MANAGER, ClubRole.CO_MANAGER)
 */
export function ClubRoles(mode: ClubRolesGuardMode, ...roles: ClubRole[]) {
  return applyDecorators(
    SetMetadata(CLUB_ROLES_MODE_KEY, mode),
    SetMetadata(CLUB_ROLES_KEY, roles),
  );
}
