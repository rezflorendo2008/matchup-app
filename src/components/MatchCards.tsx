import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, ClubAvatar, ClubVerificationBadge, MatchStatusBadge, PressScale, Row, TeamAvatar, pts, whenShort } from '../ui';
import { CalendarIcon, ChevronRightIcon } from '../icons';
import { colors, radius, spacing } from '../theme';
import type { Match } from '../types';

export type OpenMatch = (m: Match, side?: 'a' | 'b') => void;

const detail = (m: Match, k: 'a' | 'b') => (m.mode === 'club' ? `×${(k === 'a' ? m.multiplier_a : m.multiplier_b) ?? '-'}` : `${pts(k === 'a' ? m.open_a : m.open_b)} 💎 open`);

/** "You predicted 120 💎" for this user on one match (shown on every match card). */
export function MyPredicted({ m, style }: { m: Match; style?: any }) {
  const v = Number(m.my_diamonds ?? 0);
  return (
    <Text style={[{ color: v > 0 ? colors.primarySoft : colors.dim, fontSize: 12.5, fontWeight: v > 0 ? '800' : '500' }, style]}>
      {v > 0 ? `You predicted ${pts(v)} 💎` : 'No prediction yet'}
    </Text>
  );
}

/** Club line: icon, name and verified tick. */
export function ClubLine({ m, size = 18 }: { m: Match; size?: number }) {
  return (
    <Row>
      <ClubAvatar name={m.club} logo={m.club_logo} size={size} />
      <Text style={{ color: colors.dim, fontSize: 12.5, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{m.club}</Text>
      {m.club_verified ? <ClubVerificationBadge size={14} /> : null}
    </Row>
  );
}

/** One side of a match: avatar, name and its multipliers / open diamonds. Tapping it opens the prediction slip on that side. */
export function TeamPlayerCard({ m, k, onOpen, compact }: { m: Match; k: 'a' | 'b'; onOpen: OpenMatch; compact?: boolean }) {
  const col = k === 'a' ? colors.primary : colors.warning;
  const won = m.status === 'settled' && m.result === k;
  const name = k === 'a' ? m.side_a : m.side_b;
  return (
    <PressScale onPress={() => onOpen(m, k)} scaleTo={0.96} wrapStyle={{ flex: 1 }} style={{
      flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: compact ? 10 : 12, paddingHorizontal: 8, borderRadius: radius.md,
      backgroundColor: won ? colors.success + '1A' : colors.bg2, borderWidth: won ? 1.5 : 1, borderColor: won ? colors.success : colors.line,
    }}>
      <TeamAvatar name={name} color={col} size={compact ? 38 : 46} />
      {m.has_score && (m.score_a != null || m.score_b != null) ? <Text style={{ color: colors.text, fontSize: compact ? 24 : 30, fontWeight: '800', marginTop: 6, letterSpacing: -0.5 }}>{(k === 'a' ? m.score_a : m.score_b) ?? 0}</Text> : null}
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, marginTop: 8, textAlign: 'center' }} numberOfLines={2}>{name}</Text>
      <Text style={{ color: won ? colors.success : col, fontSize: 12, fontWeight: '700', marginTop: 2, textAlign: 'center' }}>{won ? '🏆 Won' : detail(m, k)}</Text>
    </PressScale>
  );
}

/** Prominent card for matches that are open for predictions. */
export function LiveMatchCard({ m, onOpen }: { m: Match; onOpen: OpenMatch }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: m.status === 'open' ? colors.success + '55' : colors.line, padding: spacing.lg, marginBottom: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.primarySoft, fontWeight: '700', fontSize: 12.5, flex: 1, marginRight: 8 }} numberOfLines={1}>
          {m.category_icon ? `${m.category_icon} ` : ''}{m.category ?? 'Match'}{m.event ? ` · ${m.event}` : ''}
        </Text>
        <MatchStatusBadge status={m.status} />
      </Row>
      <Pressable onPress={() => onOpen(m)}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 10, letterSpacing: -0.2 }} numberOfLines={2}>{m.title}</Text>
      </Pressable>
      <View style={{ marginTop: 6 }}><ClubLine m={m} /></View>
      <Row style={{ marginTop: 14, alignItems: 'stretch' }}>
        <TeamPlayerCard m={m} k="a" onOpen={onOpen} />
        <View style={{ width: 34, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.dim, fontWeight: '800', fontSize: 12 }}>VS</Text></View>
        <TeamPlayerCard m={m} k="b" onOpen={onOpen} />
      </Row>
      <MyPredicted m={m} style={{ marginTop: 10, textAlign: 'center' }} />
      <Button title={m.status === 'open' ? 'View match & predict' : 'View match'} onPress={() => onOpen(m)} small style={{ marginTop: 14 }} />
    </View>
  );
}

/** Compact row for upcoming (or completed) matches. */
export function UpcomingMatchCard({ m, onOpen }: { m: Match; onOpen: OpenMatch }) {
  return (
    <PressScale onPress={() => onOpen(m)} scaleTo={0.985} style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.primarySoft, fontWeight: '700', fontSize: 12, flex: 1, marginRight: 8 }} numberOfLines={1}>{m.category_icon ? `${m.category_icon} ` : ''}{m.category ?? 'Match'}</Text>
        <MatchStatusBadge status={m.status} compact />
      </Row>
      <Row style={{ marginTop: 10 }}>
        <TeamAvatar name={m.side_a} size={32} color={colors.primary} />
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{m.side_a} <Text style={{ color: colors.primarySoft, fontWeight: '800', fontSize: 12 }}>VS</Text> {m.side_b}</Text>
          <Text style={{ color: colors.dim, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{m.title}</Text>
        </View>
        <TeamAvatar name={m.side_b} size={32} color={colors.warning} />
      </Row>
      <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
        <Row style={{ flex: 1 }}>
          <CalendarIcon size={14} color={colors.dim} />
          <Text style={{ color: colors.dim, fontSize: 12, marginLeft: 5 }} numberOfLines={1}>{m.scheduled_at ? whenShort(m.scheduled_at) : 'Time to be announced'}</Text>
        </Row>
        <ClubLine m={m} size={16} />
        <ChevronRightIcon size={16} color={colors.dim} />
      </Row>
      <MyPredicted m={m} style={{ marginTop: 8 }} />
    </PressScale>
  );
}
