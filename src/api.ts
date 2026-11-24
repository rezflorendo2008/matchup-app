import { BASE } from './config';
import { useAuth } from './store';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

async function request<T>(method: string, path: string, body?: any, isForm = false): Promise<T> {
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
    throw new ApiError(`Cannot reach the server at ${BASE}. Check that the backend is running and EXPO_PUBLIC_API_URL is correct.`, 0);
  } finally { clearTimeout(timer); }

  if (res.status === 204) return undefined as T;
  let data: any = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    const first = data?.errors ? (Object.values(data.errors)[0] as string[])?.[0] : null;
    const msg: string = first || data?.message || `Request failed (${res.status})`;
    const accountBlocked = res.status === 403 && /^Your account is/i.test(msg);
    if ((res.status === 401 && token) || accountBlocked) useAuth.getState().signOut();
    throw new ApiError(msg, res.status);
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
