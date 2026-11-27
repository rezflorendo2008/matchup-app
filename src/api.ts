import { BASE, SECURE_TRANSPORT } from './config';
import { useAuth } from './store';
import { useMaint } from './maintenance';

export class ApiError extends Error {
  status: number;
  /** { email: 'An account with this email already exists…', … } when the server says which box is wrong */
  fields: Record<string, string>;
  constructor(message: string, status: number, fields: Record<string, string> = {}) { super(message); this.status = status; this.fields = fields; }
}
/** Field errors from a failed request ({} when none). */
export const fieldErrors = (e: unknown): Record<string, string> => (e instanceof ApiError ? e.fields : {});

async function request<T>(method: string, path: string, body?: any, isForm = false): Promise<T> {
  if (!SECURE_TRANSPORT) throw new ApiError('This build is not configured for a secure connection. Please update the app.', 0);   // never send a login over plain http
  const token = useAuth.getState().token;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined, signal: ctrl.signal });
  } catch {
    throw new ApiError(__DEV__ ? `Cannot reach the server at ${BASE}. Check that the backend is running and EXPO_PUBLIC_API_URL is correct.` : 'Cannot reach PickArena right now. Check your connection and try again.', 0);
  } finally { clearTimeout(timer); }

  if (res.status === 204) return undefined as T;
  let data: any = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    if (res.status === 503 && data?.maintenance) { useMaint.getState().set({ title: data.title, message: data.message, eta: data.eta }); throw new ApiError(data.message || 'PickArena is under maintenance.', 503); }
    const first = data?.errors ? (Object.values(data.errors)[0] as string[])?.[0] : null;
    let msg: string = first || data?.message || `Request failed (${res.status})`;
    // Release builds never show raw server errors (they can contain internals); people see a calm message instead.
    if (!__DEV__ && res.status >= 500) msg = 'PickArena is having a problem. Please try again in a moment.';
    if (res.status === 429) msg = data?.message || 'Too many attempts. Please wait a moment and try again.';
    const accountBlocked = res.status === 403 && /^Your account is/i.test(msg);
    if ((res.status === 401 && token) || accountBlocked) useAuth.getState().signOut();
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(data?.errors ?? {})) fields[k] = Array.isArray(v) ? String(v[0]) : String(v);
    throw new ApiError(msg, res.status, fields);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: any) => request<T>('POST', p, b ?? {}),
  put: <T>(p: string, b?: any) => request<T>('PUT', p, b ?? {}),
  del: <T>(p: string) => request<T>('DELETE', p),
  upload: <T>(p: string, form: FormData) => request<T>('POST', p, form, true),
};

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong');
