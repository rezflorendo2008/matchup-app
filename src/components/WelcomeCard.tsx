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
      style={{ backgroundColor: colors.primary + '1A', borderWidth: kind ? 1.5 : 1, borderColor: border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginTop: 2, marginBottom: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>{title}</Text>
        {badge}
      </View>
      {sub ? <Dim style={{ marginTop: 1, fontSize: 12.5 }}>{sub}</Dim> : null}
      {club && multi ? (
        // only with 2+ clubs (one club needs no reminder): which club you're in, its own line, never cut off
        <View style={{ marginTop: 8, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ClubAvatar name={club.name} logo={club.logo} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primarySoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' }}>You're in</Text>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, lineHeight: 19 }} numberOfLines={2}>
                {club.name}{club.status === 'active' ? '  ' : ''}
                {club.status === 'active' ? <ClubVerificationBadge size={14} /> : null}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.line }}>
            <Pressable onPress={() => nav.navigate('Diamonds')} accessibilityRole="button" accessibilityLabel={`${pts(club.balance)} diamonds in ${club.name}`} hitSlop={6}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <DiamondIcon size={15} color={colors.primarySoft} />
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>{pts(club.balance)}</Text>
            </Pressable>
            {(
              <Pressable onPress={() => nav.navigate('ChooseClub')} accessibilityRole="button" accessibilityLabel={`Switch club (now ${club.name})`} hitSlop={8}
                style={({ pressed }) => ({ minHeight: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.primary, justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: colors.primarySoft, fontWeight: '800', fontSize: 13 }}>⇄ Switch club</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}
