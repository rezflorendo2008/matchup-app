const env = (k: string): string => ((process.env as any)[k] ?? '').toString().trim();

/** Where the Laravel API lives. Set EXPO_PUBLIC_API_URL in .env, then restart with `npx expo start -c`. */
export const BASE = (env('EXPO_PUBLIC_API_URL') || 'http://pickarena.test/api/v1').replace(/\/+$/, '');
/** Server root (used for websocket auth). */
export const ORIGIN = BASE.replace(/\/api\/v1$/, '');

export const REVERB = {
  key: env('EXPO_PUBLIC_REVERB_KEY'),
  host: env('EXPO_PUBLIC_REVERB_HOST') || ORIGIN.replace(/^https?:\/\//, '').replace(/[:/].*$/, ''),
  port: Number(env('EXPO_PUBLIC_REVERB_PORT')) || 8080,
  tls: env('EXPO_PUBLIC_REVERB_SCHEME') === 'https',
};
/** Live updates by websocket only when Reverb is configured; otherwise screens poll. */
export const REALTIME_ON = REVERB.key.length > 0;
export const POLL_MS = REALTIME_ON ? false : 15000;

export const GOOGLE = {
  web: env('EXPO_PUBLIC_GOOGLE_CLIENT_ID'),
  ios: env('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
  android: env('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
};
export const FACEBOOK_APP_ID = env('EXPO_PUBLIC_FACEBOOK_APP_ID');
export const RC = { ios: env('EXPO_PUBLIC_RC_IOS_KEY'), android: env('EXPO_PUBLIC_RC_ANDROID_KEY') };
