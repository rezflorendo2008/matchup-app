/** Central design tokens for MatchUp. Change a value here and the whole app follows. */
export const colors = {
  bg: '#0B1020',
  bg2: '#11192B',
  card: '#171F35',
  elevated: '#202B49',
  line: '#293550',
  primary: '#397BFF',
  primarySoft: '#75A7FF',
  success: '#18C987',
  warning: '#FF906F',
  danger: '#FF5D6C',
  amber: '#F5B544',
  text: '#F4F6FF',
  dim: '#929DB8',
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

/** Inter / SF Pro are used when installed; the system font (SF Pro on iOS, Roboto on Android) otherwise. */
export const font = {
  family: undefined as string | undefined,
  size: { xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 28 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' } as const,
};

export const shadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
};

export const TAB_BAR_HEIGHT = 58;
