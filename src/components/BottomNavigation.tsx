import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { DiamondIcon, HomeIcon, TargetIcon, UserIcon, UsersIcon } from '../icons';
import { colors, TAB_BAR_HEIGHT } from '../theme';

const ICONS: Record<string, (p: { size?: number; color?: string; filled?: boolean }) => React.ReactElement> = {
  Home: HomeIcon, Matches: TargetIcon, Clubs: UsersIcon, Diamonds: DiamondIcon, Profile: UserIcon,
};

function Item({ label, focused, onPress, onLongPress, Icon }: { label: string; focused: boolean; onPress: () => void; onLongPress: () => void; Icon: any }) {
  const v = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => { Animated.timing(v, { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: true }).start(); }, [focused]);
  const lift = v.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const color = focused ? colors.primary : colors.dim;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }} style={s.item} hitSlop={4}>
      <Animated.View style={{ alignItems: 'center', transform: [{ translateY: lift }] }}>
        <Animated.View style={[s.dot, { opacity: v }]} />
        <Icon size={24} color={color} filled={focused} />
        <Text style={[s.label, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Custom tab bar: SVG icons, blue when active, muted when inactive, safe-area aware. */
export function BottomNavigation({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 0) }]}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const label = descriptors[route.key].options.title ?? route.name;
        const press = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
        };
        return <Item key={route.key} label={label} focused={focused} onPress={press} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} Icon={ICONS[route.name] ?? HomeIcon} />;
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.bg2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  label: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  dot: { position: 'absolute', top: -8, width: 22, height: 3, borderRadius: 2, backgroundColor: colors.primary },
});
