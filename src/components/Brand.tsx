import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, font } from '../theme';

/* Official PickArena diamond-P mark and faceted diamond (vector paths from the brand kit: public/branding/pickarena-mark.svg). */

function Gem() {
  return (
    <>
      <Path d="M91 20 111 8h34l20 12-37 43Z" fill="#22C7E8" stroke="#BDF7FF" strokeWidth={3} strokeLinejoin="round" />
      <Path d="M91 20h74l-17 17h-40Z" fill="#35D9FF" />
      <Path d="M111 8 108 20h40l-3-12Z" fill="#8CEBFF" />
      <Path d="m108 20 20 43 20-43Z" fill="#0A84FF" />
      <Path d="m91 20 17 0 20 43Z" fill="#4F46FF" opacity={0.9} />
      <Path d="m165 20-17 0-20 43Z" fill="#0A84FF" />
    </>
  );
}

/** The standalone diamond + P mark, for compact spaces, headers and avatars. `light` gives the P a dark tail for light backgrounds. */
export function BrandMark({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" accessibilityLabel="PickArena" accessible>
      <Defs>
        <LinearGradient id="paBlue" x1="0.08" y1="0.9" x2="0.9" y2="0.1">
          <Stop offset="0" stopColor="#087BFF" />
          <Stop offset="1" stopColor="#22C7E8" />
        </LinearGradient>
      </Defs>
      <Gem />
      <Path fill="url(#paBlue)" d="M52 72h121c34 0 54 19 54 48 0 31-24 52-59 52h-42l-35 54H34l53-83h82c12 0 19-7 19-17 0-9-6-15-18-15H42Z" />
      <Path fill={light ? '#14307A' : '#F8FAFF'} d="M87 143h57l-65 83H24Z" />
    </Svg>
  );
}

/** The PickArena virtual diamond: the faceted gem from the logo. Use it everywhere a diamond amount or reward appears. */
export function DiamondGem({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="88 -4.5 80 80" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Gem />
    </Svg>
  );
}

const SIZES = { sm: { gem: 14, text: 13 }, md: { gem: 18, text: 15 }, lg: { gem: 26, text: 22 }, xl: { gem: 36, text: 30 } } as const;

/** [gem] 2,450. Virtual diamonds only: no currency symbol, nothing that suggests real money. */
export function DiamondBalance({ value, size = 'md', prefix, color = colors.text }: { value: number | string; size?: keyof typeof SIZES; prefix?: string; color?: string }) {
  const n = Number(value);
  const shown = Number.isFinite(n) ? n.toLocaleString('en-US') : String(value);
  const d = SIZES[size];
  return (
    <View accessible accessibilityLabel={`${prefix ?? ''}${shown} diamonds`} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <DiamondGem size={d.gem} />
      <Text style={{ color, fontSize: d.text, fontWeight: font.weight.heavy, marginLeft: 6 }}>{prefix}{shown}</Text>
    </View>
  );
}
