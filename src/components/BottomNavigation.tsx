import React, { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { api } from '../api';
import { POLL_MS } from '../config';
import { useAuth } from '../store';
import { HistoryIcon, HomeIcon, TargetIcon, UsersIcon } from '../icons';
import { colors, TAB_BAR_HEIGHT } from '../theme';
import type { Match } from '../types';

const ICONS: Record<string, (p: { size?: number; color?: string; filled?: boolean }) => React.ReactElement> = {
  Home: HomeIcon, Matches: TargetIcon, Clubs: UsersIcon, History: HistoryIcon,
};

const initials = (n?: string) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';

/** Round initials avatar for the Account tab (how the big social apps show your profile picture in their menu). */
function Avatar({ name, focused }: { name?: string; focused: boolean }) {
  return (
    <View style={[s.avatar, focused && { borderColor: colors.primary, backgroundColor: colors.primary + '26' }]}>
      <Text style={{ color: focused ? colors.primary : colors.text, fontSize: 10.5, fontWeight: '800' }}>{initials(name)}</Text>
    </View>
  );
}

function Item({ name, label, focused, badge, onPress, onLongPress }: { name: string; label: string; focused: boolean; badge: number; onPress: () => void; onLongPress: () => void }) {
  const press = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(press, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const user = useAuth((st) => st.user);
  const color = focused ? colors.primary : colors.dim;
  const Icon = ICONS[name] ?? HomeIcon;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} onPressIn={() => to(0.9)} onPressOut={() => to(1)} hitSlop={4} style={s.item}
      accessibilityRole="tab" accessibilityLabel={badge ? `${label}, ${badge} live` : label} accessibilityState={{ selected: focused }}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: press }] }}>
        <View style={s.icon}>
          {name === 'Profile' ? <Avatar name={user?.name} focused={focused} /> : <Icon size={25} color={color} filled={focused} />}
          {badge > 0 ? <View style={s.badge}><Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
        </View>
        <Text style={[s.label, { color, fontWeight: focused ? '700' : '600' }]} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Bottom menu in the style of the big social apps: icon over a small label, the active tab a filled blue icon with a blue label
 * (no indicator bar), a red count badge (live matches on Matches) and your avatar on Account. Safe-area aware.
 */
export function BottomNavigation({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // same query as the home screen, so this costs no extra request
  const matches = useQuery({ queryKey: ['matches', 'all'], queryFn: () => api.get<Match[]>('/matches'), refetchInterval: POLL_MS });
  const live = (matches.data ?? []).filter((m) => m.status === 'closed').length;
  return (
    <View style={[s.bar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 0) }]}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const label = descriptors[route.key].options.title ?? route.name;
        const press = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
        };
        return <Item key={route.key} name={route.name} label={label} focused={focused} badge={route.name === 'Matches' ? live : 0}
          onPress={press} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} />;
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.bg2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  icon: { height: 28, minWidth: 28, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, marginTop: 2 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated, borderWidth: 2, borderColor: 'transparent' },
  badge: { position: 'absolute', top: -4, left: 16, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg2 },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
});
