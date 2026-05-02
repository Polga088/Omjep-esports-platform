import type { UserRole } from '@omjep/shared'

/** Champs utiles renvoyés par `GET /teams/my-team` (club + roster) pour le Mercato. */
export type MercatoMyTeamPayload = {
  id: string
  name: string
  budget: number
  manager_id?: string | null
  members?: Array<{ user_id: string; club_role: string }>
}

const STAFF_CLUB_ROLES = new Set(['FOUNDER', 'MANAGER', 'CO_MANAGER'])

/**
 * Indique si l’utilisateur peut initier une offre (POST /transfers/offer) pour ce club :
 * - ADMIN : oui
 * - Dirigeant club (FOUNDER / MANAGER / CO_MANAGER) via `team.members`
 * - Fallback : rôle global MANAGER + `team.manager_id === user.id` (club géré sans ligne `team_members`)
 */
export function mercatoCanInitiateTransferOffer(
  user: { id: string; role: UserRole } | null | undefined,
  team: MercatoMyTeamPayload | null,
): boolean {
  if (!user || !team?.id) return false
  if (user.role === 'ADMIN') return true
  const myMembership = team.members?.find((m) => m.user_id === user.id)
  if (myMembership && STAFF_CLUB_ROLES.has(myMembership.club_role)) return true
  if (user.role === 'MANAGER' && team.manager_id === user.id) return true
  return false
}
