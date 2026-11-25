import * as SecureStore from 'expo-secure-store';

/** A club invite link opened before the person had an account: remembered until they sign in. */
export type PendingJoin = { slug: string; ref?: string };
const KEY = 'pickarena.pendingJoin';

/** pickarena://join/<slug>?ref=CODE  or  https://host/join/<slug>?ref=CODE */
export function parseJoinUrl(url?: string | null): PendingJoin | null {
  if (!url) return null;
  const m = /join\/([\w-]+)(?:\?([^#]*))?/.exec(url);
  if (!m) return null;
  const ref = new URLSearchParams(m[2] ?? '').get('ref') ?? undefined;
  return { slug: m[1], ref: ref ? ref.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || undefined : undefined };
}
export async function savePending(p: PendingJoin) { try { await SecureStore.setItemAsync(KEY, JSON.stringify(p)); } catch {} }
export async function readPending(): Promise<PendingJoin | null> {
  try { const raw = await SecureStore.getItemAsync(KEY); return raw ? (JSON.parse(raw) as PendingJoin) : null; } catch { return null; }
}
export async function clearPending() { try { await SecureStore.deleteItemAsync(KEY); } catch {} }
