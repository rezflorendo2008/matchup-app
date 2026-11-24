import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from './types';

const KEY = 'matchup.auth';

interface AuthState {
  hydrated: boolean; token: string | null; user: User | null;
  hydrate: () => Promise<void>;
  setAuth: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  hydrated: false, token: null, user: null,
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) { const v = JSON.parse(raw); set({ token: v.token, user: v.user }); }
    } catch {}
    set({ hydrated: true });
  },
  setAuth: async (token, user) => {
    set({ token, user });
    try { await SecureStore.setItemAsync(KEY, JSON.stringify({ token, user })); } catch {}
  },
  setUser: (user) => {
    const token = get().token;
    set({ user });
    if (token) SecureStore.setItemAsync(KEY, JSON.stringify({ token, user })).catch(() => {});
  },
  signOut: async () => {
    set({ token: null, user: null });
    try { await SecureStore.deleteItemAsync(KEY); } catch {}
  },
}));
