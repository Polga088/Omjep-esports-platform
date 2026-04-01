/** Pagination : messages chargés par page (API + client). */
export const CHAT_MESSAGES_PAGE_SIZE = 20;

/** Préfixe room Socket.io : club / équipe */
export const CHAT_ROOM_TEAM_PREFIX = 'team:';

/** Préfixe room Socket.io : message privé entre deux utilisateurs */
export const CHAT_ROOM_DM_PREFIX = 'dm:';

export function chatTeamRoomId(teamId: string): string {
  return `${CHAT_ROOM_TEAM_PREFIX}${teamId}`;
}

/** Room id stable pour une DM (ordre des UUIDs trié lexicographiquement). */
export function chatDmRoomId(userIdA: string, userIdB: string): string {
  const [a, b] = [userIdA, userIdB].sort();
  return `${CHAT_ROOM_DM_PREFIX}${a}:${b}`;
}
