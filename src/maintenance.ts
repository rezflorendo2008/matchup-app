import { create } from 'zustand';

export type MaintInfo = { title?: string | null; message?: string | null; eta?: string | null };
type State = { on: boolean; info: MaintInfo; set: (info: MaintInfo) => void; clear: () => void };

/** True while the server says PickArena is in maintenance mode (set by any 503 {maintenance:true} reply or the status check). */
export const useMaint = create<State>((set) => ({
  on: false, info: {},
  set: (info) => set({ on: true, info }),
  clear: () => set({ on: false, info: {} }),
}));
