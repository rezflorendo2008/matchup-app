import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from './theme';

export interface IconProps { size?: number; color?: string; filled?: boolean }
const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const });
const stroke = (color: string) => ({ stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const HomeIcon = ({ size = 24, color = colors.dim, filled }: IconProps) => (
  <Svg {...base(size)}><Path d="M4 11.2 12 4l8 7.2V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-7.8Z" {...stroke(color)} fill={filled ? color : 'none'} fillOpacity={filled ? 0.18 : 0} /></Svg>
);
export const TargetIcon = ({ size = 24, color = colors.dim, filled }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx="12" cy="12" r="8.5" {...stroke(color)} fill={filled ? color : 'none'} fillOpacity={filled ? 0.18 : 0} />
    <Circle cx="12" cy="12" r="4.5" {...stroke(color)} />
    <Circle cx="12" cy="12" r="1.2" fill={color} />
  </Svg>
);
export const UsersIcon = ({ size = 24, color = colors.dim, filled }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx="9" cy="8.5" r="3.3" {...stroke(color)} fill={filled ? color : 'none'} fillOpacity={filled ? 0.18 : 0} />
    <Path d="M3 19.5c0-3.1 2.7-5.2 6-5.2s6 2.1 6 5.2" {...stroke(color)} />
    <Path d="M16 5.6a3.1 3.1 0 0 1 0 5.8M18 14.6c1.8.6 3 2.2 3 4.4" {...stroke(color)} />
  </Svg>
);
export const DiamondIcon = ({ size = 24, color = colors.dim, filled }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M7 4h10l4 5.2L12 20 3 9.2 7 4Z" {...stroke(color)} fill={filled ? color : 'none'} fillOpacity={filled ? 0.2 : 0} />
    <Path d="M3 9.2h18M9.2 4 8 9.2 12 20l4-10.8L14.8 4" {...stroke(color)} />
  </Svg>
);
export const UserIcon = ({ size = 24, color = colors.dim, filled }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx="12" cy="8.2" r="3.7" {...stroke(color)} fill={filled ? color : 'none'} fillOpacity={filled ? 0.18 : 0} />
    <Path d="M4.5 20c.4-3.6 3.5-5.6 7.5-5.6s7.1 2 7.5 5.6" {...stroke(color)} />
  </Svg>
);
export const PlusIcon = ({ size = 16, color = colors.white }: IconProps) => (
  <Svg {...base(size)}><Path d="M12 5v14M5 12h14" {...stroke(color)} strokeWidth={2.4} /></Svg>
);
export const ChevronRightIcon = ({ size = 18, color = colors.dim }: IconProps) => (
  <Svg {...base(size)}><Path d="m9 6 6 6-6 6" {...stroke(color)} /></Svg>
);
export const ChevronDownIcon = ({ size = 18, color = colors.dim }: IconProps) => (
  <Svg {...base(size)}><Path d="m6 9 6 6 6-6" {...stroke(color)} /></Svg>
);
export const CheckBadgeIcon = ({ size = 16, color = colors.primary }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M12 2.6 14.3 4l2.7-.1 1.2 2.4 2.4 1.2-.1 2.7 1.4 2.3-1.4 2.3.1 2.7-2.4 1.2-1.2 2.4-2.7-.1L12 21.4 9.7 20l-2.7.1-1.2-2.4-2.4-1.2.1-2.7L2.1 11.5l1.4-2.3-.1-2.7 2.4-1.2L7 2.9 9.7 3 12 2.6Z" fill={color} />
    <Path d="m8.2 12.2 2.6 2.6 5-5.3" stroke={colors.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
export const CalendarIcon = ({ size = 16, color = colors.dim }: IconProps) => (
  <Svg {...base(size)}>
    <Rect x="3.5" y="5" width="17" height="15" rx="3" {...stroke(color)} />
    <Path d="M3.5 10h17M8 3v4M16 3v4" {...stroke(color)} />
  </Svg>
);
export const ClockIcon = ({ size = 16, color = colors.dim }: IconProps) => (
  <Svg {...base(size)}><Circle cx="12" cy="12" r="8.5" {...stroke(color)} /><Path d="M12 7.5V12l3 2" {...stroke(color)} /></Svg>
);
export const TrophyIcon = ({ size = 16, color = colors.amber }: IconProps) => (
  <Svg {...base(size)}>
    <Path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" {...stroke(color)} />
    <Path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" {...stroke(color)} />
  </Svg>
);
export const MapPinIcon = ({ size = 16, color = colors.dim }: IconProps) => (
  <Svg {...base(size)}><Path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11Z" {...stroke(color)} /><Circle cx="12" cy="10" r="2.3" {...stroke(color)} /></Svg>
);
export const SearchIcon = ({ size = 18, color = colors.dim }: IconProps) => (
  <Svg {...base(size)}><Circle cx="11" cy="11" r="6.5" {...stroke(color)} /><Path d="m16 16 4 4" {...stroke(color)} /></Svg>
);
export const MegaphoneIcon = ({ size = 16, color = colors.dim }: IconProps) => (
  <Svg {...base(size)}><Path d="M4 10v4h3l7 4V6L7 10H4Z" {...stroke(color)} /><Path d="M17.5 9.5a4 4 0 0 1 0 5" {...stroke(color)} /></Svg>
);
export const AlertIcon = ({ size = 18, color = colors.danger }: IconProps) => (
  <Svg {...base(size)}><Circle cx="12" cy="12" r="8.5" {...stroke(color)} /><Path d="M12 8v5M12 16.2v.1" {...stroke(color)} strokeWidth={2.2} /></Svg>
);
export const HistoryIcon = ({ size = 18, color = colors.dim }: IconProps) => (
  <Svg {...base(size)}><Path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5M4 4v4.5h4.5M12 8v4.2l2.8 1.6" {...stroke(color)} /></Svg>
);
export const ShieldIcon = ({ size = 18, color = colors.dim }: IconProps) => (
  <Svg {...base(size)}><Path d="M12 3 5 6v5.5c0 4.2 2.8 7.6 7 9.5 4.2-1.9 7-5.3 7-9.5V6l-7-3Z" {...stroke(color)} /><Path d="m9 12 2.2 2.2L15.2 10" {...stroke(color)} /></Svg>
);
export const LogOutIcon = ({ size = 18, color = colors.danger }: IconProps) => (
  <Svg {...base(size)}><Path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10" {...stroke(color)} /></Svg>
);
export const ArrowUpIcon = ({ size = 16, color = colors.success }: IconProps) => (<Svg {...base(size)}><Path d="M12 19V5M6 11l6-6 6 6" {...stroke(color)} /></Svg>);
export const ArrowDownIcon = ({ size = 16, color = colors.danger }: IconProps) => (<Svg {...base(size)}><Path d="M12 5v14M6 13l6 6 6-6" {...stroke(color)} /></Svg>);

export const BellIcon = ({ size = 22, color = colors.text }: IconProps) => (
  <Svg {...base(size)}><Path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9ZM10 19a2 2 0 0 0 4 0" {...stroke(color)} /></Svg>
);
