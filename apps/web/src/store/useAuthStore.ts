import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@omjep/shared';

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
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  patchUser: (partial: Partial<User>) => void;
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
