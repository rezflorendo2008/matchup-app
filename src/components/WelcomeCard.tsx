import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ClubAvatar, ClubVerificationBadge, Dim, pts } from '../ui';
import { DiamondIcon } from '../icons';
import { colors, radius } from '../theme';
import { useWelcome, welcomeNow } from '../welcome';
import type { Club, User } from '../types';

const isNew = (u?: User | null) => !!u?.joined_at && Date.now() - new Date(u.joined_at).getTime() < 15 * 60 * 1000;
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

/** Home headline: welcome right after login / switching club, otherwise a greeting for the time of day. */
export function welcomeTitle(user: User | null | undefined, club: Club | null): string {
  const kind = welcomeNow();
  const first = (user?.name ?? '').trim().split(/\s+/)[0] || 'there';
  return kind === 'login' ? (isNew(user) ? `Welcome to PickArena, ${first} 🎉` : `Welcome back, ${first} 👋`)
    : kind === 'switch' && club ? `Welcome to ${club.name} 👋` : `${greeting()}, ${first}`;
}

/** Top of Home: the greeting and which club you're in (with its diamonds). Says "Welcome back" after login and "Welcome to {club}" after switching. */
export function WelcomeCard({ user, club, multi, badge }: { user?: User | null; club: Club | null; multi: boolean; badge?: React.ReactNode }) {
  const nav = useNavigation<any>();
  useWelcome((s) => s.until);   // re-render when a new welcome starts
  const kind = welcomeNow();
  const [, tick] = useState(0);
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!kind) return;
    glow.setValue(1);
    Animated.timing(glow, { toValue: 0, duration: 2400, useNativeDriver: false }).start();
    const t = setTimeout(() => tick((n) => n + 1), Math.max(0, useWelcome.getState().until - Date.now()) + 50);   // back to the normal greeting
    return () => clearTimeout(t);
  }, [kind, club?.id]);

  const title = welcomeTitle(user, club);
  const sub = kind === 'login' ? (club ? "Here's what's happening in your club." : '') : kind === 'switch' && club ? 'Matches, diamonds and history now show this club.' : '';
  const border = glow.interpolate({ inputRange: [0, 1], outputRange: [kind ? colors.primary : colors.line, '#3DD8FF'] });

  return (
    <Animated.View accessibilityLiveRegion={kind ? 'polite' : 'none'}
      style={{ backgroundColor: colors.primary + '1A', borderWidth: kind ? 1.5 : 1, borderColor: border, borderRadius: 20, padding: 14, marginTop: 4, marginBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }}>{title}</Text>
        {badge}
      </View>
      {sub ? <Dim style={{ marginTop: 2 }}>{sub}</Dim> : null}
      {club ? (
        // the club is the main thing here: its own line, large, never cut off
        <View style={{ marginTop: 12, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ClubAvatar name={club.name} logo={club.logo} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primarySoft, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' }}>You're in</Text>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 19, lineHeight: 24, marginTop: 2 }} numberOfLines={2}>
                {club.name}{club.status === 'active' ? '  ' : ''}
                {club.status === 'active' ? <ClubVerificationBadge size={16} /> : null}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
            <Pressable onPress={() => nav.navigate('Diamonds')} accessibilityRole="button" accessibilityLabel={`${pts(club.balance)} diamonds in ${club.name}`} hitSlop={6}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <DiamondIcon size={18} color={colors.primarySoft} />
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{pts(club.balance)}</Text>
              <Dim style={{ fontSize: 13 }}>diamonds here</Dim>
            </Pressable>
            {multi ? (
              <Pressable onPress={() => nav.navigate('ChooseClub')} accessibilityRole="button" accessibilityLabel={`Switch club (now ${club.name})`}
                style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.primary, justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: colors.primarySoft, fontWeight: '800', fontSize: 14 }}>⇄ Switch club</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}
