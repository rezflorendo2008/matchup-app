import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ClubAvatar, ClubVerificationBadge, MatchStatusBadge, PressScale, Row, TeamAvatar, pts, whenShort } from '../ui';
import { CalendarIcon, ChevronRightIcon } from '../icons';
import { colors, radius, spacing } from '../theme';
import type { Match } from '../types';
import { WatchTag } from './MatchVideo';

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
export function ClubLine({ m, size = 18, fontSize = 12.5 }: { m: Match; size?: number; fontSize?: number }) {
  return (
    <Row>
      <ClubAvatar name={m.club} logo={m.club_logo} size={size} />
      <Text style={{ color: colors.dim, fontSize, fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{m.club}</Text>
      {m.club_verified ? <ClubVerificationBadge size={14} /> : null}
    </Row>
  );
}

/** One side of a match: avatar, name and its multipliers / open diamonds. Tapping it opens the prediction slip on that side. */
export function TeamPlayerCard({ m, k, onOpen, compact, dense, mini }: { m: Match; k: 'a' | 'b'; onOpen: OpenMatch; compact?: boolean; dense?: boolean; mini?: boolean }) {
  const col = k === 'a' ? colors.primary : colors.warning;
  const won = m.status === 'settled' && m.result === k;
  const name = k === 'a' ? m.side_a : m.side_b;
  return (
    <PressScale onPress={() => onOpen(m, k)} scaleTo={0.96} wrapStyle={{ flex: 1 }} style={{
      flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: mini ? 4 : dense ? 8 : compact ? 10 : 12, paddingHorizontal: mini || dense ? 6 : 8, borderRadius: mini ? 10 : radius.md,
      backgroundColor: won ? colors.success + '1A' : colors.bg2, borderWidth: won ? 1.5 : 1, borderColor: won ? colors.success : colors.line,
    }}>
      <TeamAvatar name={name} color={col} size={mini ? 22 : dense ? 32 : compact ? 38 : 46} />
      {m.has_score && (m.score_a != null || m.score_b != null) ? <Text style={{ color: colors.text, fontSize: mini ? 17 : dense ? 20 : compact ? 24 : 30, fontWeight: '800', marginTop: mini ? 2 : dense ? 3 : 6, letterSpacing: -0.5 }}>{(k === 'a' ? m.score_a : m.score_b) ?? 0}</Text> : null}
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: mini ? 11.5 : dense ? 13 : 14, marginTop: mini ? 2 : dense ? 5 : 8, textAlign: 'center' }} numberOfLines={mini || dense ? 1 : 2}>{name}</Text>
      <Text style={{ color: won ? colors.success : col, fontSize: mini ? 11 : dense ? 11.5 : 12, fontWeight: '700', marginTop: 1, textAlign: 'center' }}>{won ? '🏆 Won' : detail(m, k)}</Text>
    </PressScale>
  );
}

/** Card for live / today's matches. Kept small so more matches fit on screen. */
export function LiveMatchCard({ m, onOpen }: { m: Match; onOpen: OpenMatch }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: m.status === 'open' ? colors.success + '55' : m.status === 'closed' ? colors.danger + '55' : colors.line, padding: 8, marginBottom: 8 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.primarySoft, fontWeight: '700', fontSize: 11, flex: 1, marginRight: 8 }} numberOfLines={1}>
          {m.category_icon ? `${m.category_icon} ` : ''}{m.category ?? 'Match'}{m.event ? ` · ${m.event}` : ''}
        </Text>
        <MatchStatusBadge status={m.status} compact />
      </Row>
      <Pressable onPress={() => onOpen(m)} accessibilityRole="button" accessibilityLabel={`Open ${m.title}`}>
        <Text style={{ color: colors.text, fontSize: 13.5, fontWeight: '800', marginTop: 3, letterSpacing: -0.2 }} numberOfLines={1}>{m.title}</Text>
      </Pressable>
      <Row style={{ marginTop: 1, justifyContent: 'space-between' }}><View style={{ flexShrink: 1 }}><ClubLine m={m} size={14} fontSize={11.5} /></View><WatchTag m={m} /></Row>
      <Row style={{ marginTop: 6, alignItems: 'stretch' }}>
        <TeamPlayerCard m={m} k="a" onOpen={onOpen} mini />
        <View style={{ width: 22, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.dim, fontWeight: '800', fontSize: 10.5 }}>VS</Text></View>
        <TeamPlayerCard m={m} k="b" onOpen={onOpen} mini />
      </Row>
      <MyPredicted m={m} style={{ marginTop: 5, fontSize: 11, textAlign: 'center' }} />
      <PressScale onPress={() => onOpen(m)} accessibilityLabel={m.status === 'open' ? 'View match and predict' : 'View match'}
        style={{ marginTop: 5, backgroundColor: colors.primary, borderRadius: radius.pill, minHeight: 28, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.white, fontWeight: '800', fontSize: 12 }}>{m.status === 'open' ? 'View match & predict' : 'View match'}</Text>
      </PressScale>
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
      {/* centred: [avatar] side A / VS / side B [avatar], then the title, start time, club and my prediction */}
      <Row style={{ marginTop: 12, alignItems: 'center' }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TeamAvatar name={m.side_a} size={40} color={colors.primary} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, marginTop: 6, textAlign: 'center' }} numberOfLines={1}>{m.side_a}</Text>
        </View>
        <Text style={{ color: colors.primarySoft, fontWeight: '800', fontSize: 12, marginHorizontal: 8 }}>VS</Text>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TeamAvatar name={m.side_b} size={40} color={colors.warning} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, marginTop: 6, textAlign: 'center' }} numberOfLines={1}>{m.side_b}</Text>
        </View>
      </Row>
      {m.title ? <Text style={{ color: colors.dim, fontSize: 12, marginTop: 8, textAlign: 'center' }} numberOfLines={1}>{m.title}</Text> : null}
      <Row style={{ marginTop: 8, justifyContent: 'center', flexWrap: 'wrap', columnGap: 14, rowGap: 6 }}>
        <Row>
          <CalendarIcon size={14} color={colors.dim} />
          <Text style={{ color: colors.dim, fontSize: 12, marginLeft: 5 }} numberOfLines={1}>{m.scheduled_at ? whenShort(m.scheduled_at) : 'Time to be announced'}</Text>
        </Row>
        <ClubLine m={m} size={16} />
      </Row>
      <MyPredicted m={m} style={{ marginTop: 8, textAlign: 'center' }} />
    </PressScale>
  );
}
