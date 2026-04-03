import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@omjep/shared';
import api from '@/lib/api';

export interface User {
  id: string;
  email: string;
  ea_persona_name: string;
  role: UserRole;
  omjepCoins?: number;
  jepyCoins?: number;
  isPremium?: boolean;
  level?: number;
  xp?: number;
  preferred_position?: string;
  nationality?: string;
  /** Photo de profil — URL absolue (Dicebear) ou chemin `/api/v1/uploads/avatars/...` après upload */
  avatarUrl?: string | null;
  /** Bannière équipée — URL store, upload `/api/v1/uploads/banners/...`, ou vidéo Mixkit en preview */
  activeBannerUrl?: string | null;
  /** Store / profil — cadre avatar actif */
  activeFrameUrl?: string | null;
  /** Store / profil — item maillot équipé */
  activeJerseyId?: string | null;
  /** Rareté du set cosmétique (skins & cadres) */
  avatarRarity?: 'common' | 'premium' | 'legendary';
  /** Couleurs club pour le dégradé maillot (API `/auth/me` si maillot actif) */
  teamPrimaryColor?: string;
  teamSecondaryColor?: string;
}

/** Champs cosmétiques persistés via `PATCH /users/profile` + cache store. */
export type ProfileCosmeticsPatch = Partial<
  Pick<User, 'activeBannerUrl' | 'activeFrameUrl' | 'activeJerseyId' | 'avatarRarity'>
>;

type UpdateProfileResponse = ProfileCosmeticsPatch & {
  id: string;
  email: string;
  role: UserRole;
  ea_persona_name?: string | null;
  preferred_position?: string | null;
  nationality?: string | null;
};

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  patchUser: (partial: Partial<User>) => void;
  /** Met à jour bannière, cadre, maillot, rareté côté API puis dans le store. */
  updateProfileCosmetics: (partial: ProfileCosmeticsPatch) => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: (user, token) => {
        localStorage.setItem('token', token);
        set({
          user: {
            ...user,
            omjepCoins:
              typeof user.omjepCoins === 'number' && Number.isFinite(user.omjepCoins)
                ? user.omjepCoins
                : 1000,
            jepyCoins:
              typeof user.jepyCoins === 'number' && Number.isFinite(user.jepyCoins)
                ? user.jepyCoins
                : 0,
          },
          token,
        });
      },
      patchUser: (partial) => {
        set((state) => {
          if (!state.user) return { user: null };
          const next = { ...state.user, ...partial };
          if (next.omjepCoins !== undefined && !Number.isFinite(next.omjepCoins)) {
            next.omjepCoins = 1000;
          }
          if (next.jepyCoins !== undefined && !Number.isFinite(next.jepyCoins)) {
            next.jepyCoins = 0;
          }
          if (next.isPremium !== undefined && typeof next.isPremium !== 'boolean') {
            next.isPremium = false;
          }
          return { user: next };
        });
      },
      updateProfileCosmetics: async (partial) => {
        const { data } = await api.patch<UpdateProfileResponse>('/users/profile', partial);
        const patch: Partial<User> = {};
        if (data.activeBannerUrl !== undefined) patch.activeBannerUrl = data.activeBannerUrl;
        if (data.activeFrameUrl !== undefined) patch.activeFrameUrl = data.activeFrameUrl;
        if (data.activeJerseyId !== undefined) patch.activeJerseyId = data.activeJerseyId;
        if (data.avatarRarity !== undefined) patch.avatarRarity = data.avatarRarity;
        get().patchUser(patch);
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    },
  ),
);
