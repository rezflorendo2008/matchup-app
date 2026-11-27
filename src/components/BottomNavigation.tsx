import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { api } from '../api';
import { POLL_MS } from '../config';
import { useAuth } from '../store';
import { BellIcon, HistoryIcon, HomeIcon, TargetIcon, UsersIcon } from '../icons';
import { colors } from '../theme';
import type { Match } from '../types';

const ICONS: Record<string, (p: { size?: number; color?: string; filled?: boolean }) => React.ReactElement> = {
  Home: HomeIcon, Matches: TargetIcon, Clubs: UsersIcon, History: HistoryIcon, Alerts: BellIcon,
};

const initials = (n?: string) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('') || '?';

/** Round initials avatar for the Account tab; a blue ring when it is the open tab. */
function Avatar({ name, focused }: { name?: string; focused: boolean }) {
  return (
    <View style={[s.avatar, focused && { borderColor: colors.primary }]}>
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '800' }}>{initials(name)}</Text>
    </View>
  );
}

function Item({ name, label, focused, badge, badgeLabel, onPress, onLongPress }: {
  name: string; label: string; focused: boolean; badge: number; badgeLabel: string; onPress: () => void; onLongPress: () => void;
}) {
  const press = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(press, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const user = useAuth((st) => st.user);
  const Icon = ICONS[name] ?? HomeIcon;
  const isAccount = name === 'Profile';
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} onPressIn={() => to(0.9)} onPressOut={() => to(1)} hitSlop={2} style={s.item}
      accessibilityRole="tab" accessibilityLabel={badge ? `${label}, ${badge} ${badgeLabel}` : label} accessibilityState={{ selected: focused }}>
      <Animated.View style={[s.pill, focused && !isAccount && s.pillOn, { transform: [{ scale: press }] }]}>
        {isAccount ? <Avatar name={user?.name} focused={focused} /> : <Icon size={26} color={focused ? colors.primary : colors.text} filled={focused} />}
        {badge > 0 ? <View style={s.badge}><Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}
      </Animated.View>
    </Pressable>
  );
}

/**
 * Floating bottom menu: a rounded bar with icons only. The open tab sits in a soft blue pill with a filled blue icon,
 * red count badges (live matches, unread notifications) and your avatar on Account. Safe-area aware.
 */
export function BottomNavigation({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  // same queries the screens use, so the badges cost no extra requests
  const matches = useQuery({ queryKey: ['matches', 'all'], queryFn: () => api.get<Match[]>('/matches'), refetchInterval: POLL_MS });
  const unread = useQuery({ queryKey: ['notifications', 'unread'], queryFn: () => api.get<{ unread: number }>('/notifications/unread'), refetchInterval: POLL_MS });
  const live = (matches.data ?? []).filter((m) => m.status === 'closed').length;
  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={s.bar}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = descriptors[route.key].options.title ?? route.name;
          const press = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
          };
          const [badge, badgeLabel] = route.name === 'Matches' ? [live, 'live'] : route.name === 'Alerts' ? [unread.data?.unread ?? 0, 'unread'] : [0, ''];
          return <Item key={route.key} name={route.name} label={label} focused={focused} badge={badge} badgeLabel={badgeLabel}
            onPress={press} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} />;
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: colors.bg, paddingHorizontal: 12, paddingTop: 6 },
  bar: {
    flexDirection: 'row', alignItems: 'center', height: 64, paddingHorizontal: 6, borderRadius: 32,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 64 },
  pill: { width: '92%', maxWidth: 76, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.primary + '2E' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated, borderWidth: 2, borderColor: colors.line },
  badge: { position: 'absolute', top: 4, left: '54%', minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
