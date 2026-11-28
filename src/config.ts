/**
 * Expo only bakes EXPO_PUBLIC_* values into release builds when they are written out as `process.env.EXPO_PUBLIC_NAME`.
 * A dynamic lookup (`process.env[name]`) works with the dev server but is empty in a release APK/IPA, so every value is listed here.
 */
const VARS: Record<string, string | undefined> = {
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_ALLOW_HTTP: process.env.EXPO_PUBLIC_ALLOW_HTTP,
  EXPO_PUBLIC_REVERB_KEY: process.env.EXPO_PUBLIC_REVERB_KEY,
  EXPO_PUBLIC_REVERB_HOST: process.env.EXPO_PUBLIC_REVERB_HOST,
  EXPO_PUBLIC_REVERB_PORT: process.env.EXPO_PUBLIC_REVERB_PORT,
  EXPO_PUBLIC_REVERB_SCHEME: process.env.EXPO_PUBLIC_REVERB_SCHEME,
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_FACEBOOK_APP_ID: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
  EXPO_PUBLIC_RC_IOS_KEY: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  EXPO_PUBLIC_RC_ANDROID_KEY: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
};
const env = (k: string): string => (VARS[k] ?? '').toString().trim();

/** Where the Laravel API lives. Set EXPO_PUBLIC_API_URL in .env, then restart with `npx expo start -c`. */
export const BASE = (env('EXPO_PUBLIC_API_URL') || 'https://pickarena.test/api/v1').replace(/\/+$/, '');   // Herd serves it over HTTPS (iOS simulator: npm run ios:trust-herd)
/** Release builds talk to the server over HTTPS only. A plain http:// address is accepted just while developing. */
export const SECURE_TRANSPORT = __DEV__ || BASE.startsWith('https://') || env('EXPO_PUBLIC_ALLOW_HTTP') === '1';   // the flag is for internal preview builds only
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
