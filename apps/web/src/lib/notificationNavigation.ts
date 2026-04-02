/**
 * Cible de navigation depuis les métadonnées d'une notification persistante.
 */
export function getNotificationHref(metadata: Record<string, unknown> | null | undefined): string {
  const m = metadata ?? {};
  const type = typeof m.type === 'string' ? m.type : '';
  const category = m.category;

  if (category === 'MATCH' || type.startsWith('MATCH_')) {
    return '/dashboard/matches';
  }

  if (type === 'PLAYER_TRANSFERRED') {
    return '/dashboard/team';
  }

  if (
    type === 'TRANSFER_OFFER_RECEIVED' ||
    type === 'TRANSFER_OFFER_SENT' ||
    type === 'TRANSFER_OFFER_REJECTED' ||
    type === 'TRANSFER_OFFER_CANCELLED' ||
    type === 'TRANSFER_OFFER_ACCEPTED' ||
    type === 'TRANSFER_COUNTER' ||
    type === 'TRANSFER_NEGOTIATION' ||
    type === 'PLAYER_SOLD'
  ) {
    return '/dashboard/transfers';
  }

  return '/dashboard';
}
