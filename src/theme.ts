/** Central design tokens for PickArena (PickArena Diamond brand kit). Change a value here and the whole app follows.
 *  Mirrors public/branding/brand-tokens.css on the website. */
export const gradients = {
  primary: ['#0A84FF', '#4F46FF'] as const,
  diamond: ['#22C7E8', '#3DD8FF', '#0A84FF'] as const,
};

export const colors = {
  bg: '#0B1226',
  bg2: '#111B33',
  card: '#162442',
  elevated: '#1C2E52',
  line: '#263653',
  primary: '#0A84FF',
  primarySoft: '#3DD8FF',
  secondary: '#4F46FF',   // brand violet-blue, used in the primary gradient
  cyan: '#22C7E8',
  diamond: '#3DD8FF',
  success: '#10B981',
  warning: '#FF906F',
  danger: '#EF4444',
  amber: '#FFC542',
  text: '#F8FAFF',
  dim: '#94A3B8',
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

/** Brand font is Plus Jakarta Sans. It is used once the font is loaded (see README, Brand), the system font (SF Pro on iOS, Roboto on Android) until then. */
export const font = {
  family: undefined as string | undefined,
  size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 28 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' } as const,
};

export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
};

export const TAB_BAR_HEIGHT = 58;
