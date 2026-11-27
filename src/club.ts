import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { create } from 'zustand';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { POLL_MS } from './config';
import type { Club } from './types';
import { useWelcome } from './welcome';

/**
 * Which club you're in. With one approved club nothing changes; with 2+ you choose one first,
 * and Home, Matches, Diamonds and the diamonds in the header follow it. Remembered on this device.
 */
const KEY = 'pickarena.club';

type ActiveClub = { id: number | null; hydrated: boolean; set: (id: number) => void; hydrate: () => Promise<void> };
export const useActiveClub = create<ActiveClub>((set, get) => ({
  id: null,
  hydrated: false,
  set: (id) => { if (get().id !== id) useWelcome.getState().set('switch'); set({ id }); SecureStore.setItemAsync(KEY, String(id)).catch(() => {}); },
  hydrate: async () => {
    try { const v = await SecureStore.getItemAsync(KEY); set({ id: v ? Number(v) || null : null, hydrated: true }); }
    catch { set({ hydrated: true }); }
  },
}));

export type ClubContext = {
  loading: boolean;
  approved: Club[];
  multi: boolean;
  /** the only club, or the one you chose (null while you still have to choose) */
  active: Club | null;
  needsPick: boolean;
  /** balance shown in the header: the club you're in, or the sum when you're in just one */
  total: number;
  /** only the chosen club's items (matches, events, predictions) when you're in several */
  inClub: <T extends { club_id?: number | null }>(list: T[]) => T[];
};

export function useClubContext(): ClubContext {
  const { id, hydrated, hydrate } = useActiveClub();
  useEffect(() => { if (!hydrated) hydrate(); }, [hydrated]);
  const q = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs'), refetchInterval: POLL_MS });
  const approved = (q.data ?? []).filter((c) => c.membership === 'approved');
  const multi = approved.length >= 2;
  const active = approved.length === 1 ? approved[0] : approved.find((c) => c.id === id) ?? null;
  const total = multi ? Number(active?.balance ?? 0) : approved.reduce((a, c) => a + Number(c.balance ?? 0), 0);
  const inClub = <T extends { club_id?: number | null }>(list: T[]) =>
    multi && active ? list.filter((x) => x.club_id == null || x.club_id === active.id) : list;
  return { loading: q.isLoading || !hydrated, approved, multi, active, needsPick: hydrated && !q.isLoading && multi && !active, total, inClub };
}
