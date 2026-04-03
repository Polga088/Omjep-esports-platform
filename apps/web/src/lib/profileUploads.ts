import api from '@/lib/api';

/**
 * Envoie un fichier image (JPEG, PNG, GIF, WebP) — `POST /users/profile/avatar`.
 * Met à jour `user.avatarUrl` côté serveur ; renvoie l’URL publique (`/api/v1/uploads/avatars/...`).
 */
export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<{ avatarUrl: string | null }>('/users/profile/avatar', form);
  return data;
}

/**
 * Envoie une image ou une courte vidéo (MP4, WebM) — `POST /users/profile/banner`.
 * Met à jour `activeBannerUrl` ; renvoie l’URL publique (`/api/v1/uploads/banners/...`).
 */
export async function uploadBanner(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<{ activeBannerUrl: string | null }>('/users/profile/banner', form);
  return data;
}
