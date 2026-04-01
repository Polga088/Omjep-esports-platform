/**
 * Conventions de réponse HTTP JSON (documentées pour le front).
 * Nest peut renvoyer le corps seul ou un enveloppe selon les contrôleurs.
 */

/** Succès typé avec charge utile optionnelle méta. */
export interface ApiSuccess<T> {
  data: T;
  meta?: ApiListMeta;
}

/** Erreur HTTP alignée sur le format Nest (exception filter). */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/** Union utile pour les clients qui gèrent succès / erreur au même endroit. */
export type ApiResult<T> = ApiSuccess<T> | { error: ApiErrorBody };

/** Pagination curseur (messages, listes). */
export interface ApiListMeta {
  nextCursor?: string | null;
  hasMore?: boolean;
  total?: number;
}

/** Enveloppe explicite « succès » (optionnelle côté API). */
export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: ApiListMeta;
}
