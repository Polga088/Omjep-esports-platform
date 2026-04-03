import { useAuthStore, type AuthState } from '@/store/useAuthStore';

/** Alias pratique : même état que `useAuthStore()` (session / utilisateur JWT). */
export function useAuth(): AuthState {
  return useAuthStore();
}
