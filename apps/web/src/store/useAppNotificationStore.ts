import { create } from 'zustand';

type State = {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  incrementUnread: () => void;
};

export const useAppNotificationStore = create<State>((set) => ({
  unreadCount: 0,
  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
}));
