import { create } from 'zustand';

/** Welcome on Home for a few seconds: 'login' right after signing in, 'switch' right after entering another club (same as the website). */
export type WelcomeKind = 'login' | 'switch';
type Welcome = { kind: WelcomeKind | null; until: number; set: (k: WelcomeKind) => void };
export const WELCOME_MS = 10000;
export const useWelcome = create<Welcome>((set) => ({
  kind: null, until: 0,
  set: (kind) => set({ kind, until: Date.now() + WELCOME_MS }),
}));
/** The welcome still showing, or null. */
export const welcomeNow = (): WelcomeKind | null => { const w = useWelcome.getState(); return Date.now() < w.until ? w.kind : null; };
