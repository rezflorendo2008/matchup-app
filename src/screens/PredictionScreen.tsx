import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { POLL_MS } from '../config';
import { useAuth } from '../store';
import { FieldError, Badge, Button, Card, CardSkeleton, Chip, Dim, ErrorBox, MatchStatusBadge, PressScale, Row, Screen, SectionHeader, T, TeamAvatar, c, pts, whenShort } from '../ui';
import { ClubLine } from '../components/MatchCards';
import { MatchVideo } from '../components/MatchVideo';
import { ClubControls } from '../components/ClubControls';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from '../icons';
import { colors, radius, spacing } from '../theme';
import type { Prediction, Club, Match } from '../types';
import { showAlert } from '../dialog';
import { RequestDiamondsSheet } from '../components/RequestDiamondsSheet';
import { SuspendedNotice } from '../components/SuspendedNotice';

type Side = 'a' | 'b';
type Participants = { total: number; total_a: number; total_b: number; count: number; players: number;
  items: { id: number; name: string; side: Side; amount: number; mine: boolean; status: string; unmatched_refund?: number | null; matched_with?: { name: string; amount: number }[]; position?: number | null; confirmed_at?: string | null }[] };

const sideColor = (k: Side) => (k === 'a' ? c.a : c.b);
const QUICK = [10, 50, 100, 500];

/** What a prediction could win: club multiplier, or player-vs-player 1:1; fees come off the profit (same as the website). */
function winFor(m: Match, side: Side, amt: number) {
  const fee = Number(m.fee_pct ?? 0), keep = 1 - fee / 100, r2 = (x: number) => Math.round(x * 100) / 100;
  if (m.mode === 'club') {
    const gain = r2(amt * Number((side === 'a' ? m.multiplier_a : m.multiplier_b) ?? 0) * keep);
    return { gain, back: r2(amt + gain), fee, note: null as string | null, upTo: false };
  }
  const now = Math.min(amt, Number((side === 'a' ? m.open_b : m.open_a) ?? 0)), gain = r2(amt * keep);
  const note = now >= amt ? `All ${pts(amt)} 💎 can be matched right away.`
    : now > 0 ? `${pts(now)} 💎 can be matched right away; the rest waits for a player on the other side (returned if no one matches).`
    : 'It waits for a player on the other side to match it (returned if no one does).';
  return { gain, back: r2(amt + gain), fee, note, upTo: now < amt };
}

/** Pick · Diamonds · Confirm, so people always know where they are. */
function Steps({ at }: { at: number }) {
  return (
    <View accessible accessibilityLabel={`Step ${at} of 3`} style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
      {['Pick', 'Diamonds', 'Confirm'].map((t, i) => {
        const n = i + 1, done = n < at, on = n === at;
        return (
          <View key={t} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 9, borderRadius: 12, borderWidth: 1,
            borderColor: on ? colors.primary : colors.line, backgroundColor: on ? colors.primary + '14' : colors.bg2 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 7, backgroundColor: done ? colors.success : on ? colors.primary : colors.elevated }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{done ? '✓' : n}</Text>
            </View>
            <Text style={{ color: on || done ? colors.text : colors.dim, fontWeight: '700', fontSize: 12.5 }} numberOfLines={1}>{t}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Small pill used for match facts (mode, limit, start time). */
const Fact = ({ text }: { text: string }) => (
  <View style={{ backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginTop: 6 }}>
    <Text style={{ color: colors.dim, fontSize: 12, fontWeight: '600' }}>{text}</Text>
  </View>
);

/** One side of the match. Tapping it picks that side; the selected side gets a coloured border and a check. */
function SidePicker({ m, k, selected, canPick, onPick }: { m: Match; k: Side; selected: boolean; canPick: boolean; onPick: () => void }) {
  const col = sideColor(k);
  const name = k === 'a' ? m.side_a : m.side_b;
  const won = m.result === k;
  const score = m.has_score && (m.score_a != null || m.score_b != null) ? ((k === 'a' ? m.score_a : m.score_b) ?? 0) : null;
  return (
    <PressScale onPress={canPick ? onPick : undefined} scaleTo={0.96} accessibilityLabel={`${canPick ? 'Pick' : ''} ${name}`.trim()}
      style={{
        flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.lg,
        backgroundColor: selected ? col + '1F' : won ? colors.success + '14' : colors.card,
        borderWidth: selected || won ? 2 : 1, borderColor: selected ? col : won ? colors.success : colors.line,
      }}>
      {selected ? (
        <View style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: col, alignItems: 'center', justifyContent: 'center' }}>
          <CheckIcon size={14} />
        </View>
      ) : null}
      <TeamAvatar name={name} color={col} size={44} />
      {score != null ? <Text style={{ color: c.text, fontWeight: '800', fontSize: 26, marginTop: 4, letterSpacing: -0.5 }}>{score}</Text> : null}
      <Text style={{ color: c.text, fontWeight: '800', fontSize: 14, marginTop: 6, textAlign: 'center' }} numberOfLines={2}>{name}</Text>
      <Text style={{ color: won ? colors.success : col, fontWeight: '700', fontSize: 13, marginTop: 3 }}>
        {won ? '🏆 Won' : m.mode === 'club' ? `×${(k === 'a' ? m.multiplier_a : m.multiplier_b) ?? '-'}` : `${pts(k === 'a' ? m.open_a : m.open_b)} 💎 open`}
      </Text>
      {canPick && !selected ? <Text style={{ color: colors.dim, fontSize: 11.5, fontWeight: '600', marginTop: 6 }}>Tap to pick</Text> : null}
    </PressScale>
  );
}

/** How the diamonds are split between the two sides, with the full list of players on demand. */
/** Player vs player: the diamond difference between the two sides, and whether the club matches it (same as the website). */
function DiffLine({ m }: { m: Match }) {
  const d = Number(m.difference ?? 0);
  if (m.mode !== 'peer' || (!d && !m.covers_difference)) return null;
  const done = m.status === 'closed' || m.status === 'settled';
  const bigger = Number(m.open_a ?? 0) > Number(m.open_b ?? 0) ? m.side_a : m.side_b;
  const club = !!m.covers_difference;
  const note = club ? (done ? 'Matched by the club' : 'The club matches it when predictions close')
    : (done ? 'Unmatched diamonds were returned' : 'Not matched yet: returned when predictions close unless someone matches it');
  return (
    <View style={{ marginTop: 12, borderWidth: 1, borderColor: club ? colors.success + '55' : colors.line, backgroundColor: club ? colors.success + '12' : colors.bg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Difference</Text>
        <Text style={{ color: colors.text, fontWeight: '800' }}>{pts(d)} 💎{!done && d ? <Text style={{ color: colors.dim, fontWeight: '600', fontSize: 12.5 }}> more on {bigger}</Text> : null}</Text>
      </Row>
      <Text style={{ color: club ? colors.success : colors.dim, fontWeight: club ? '700' : '500', fontSize: 12.5, marginTop: 2 }}>{club ? '✓ ' : ''}{note}</Text>
    </View>
  );
}

function PoolCard({ m, pool }: { m: Match; pool?: Participants }) {
  const [open, setOpen] = useState(true);   // the players list starts open
  const a = Number(pool?.total_a ?? 0), b = Number(pool?.total_b ?? 0), sum = a + b;
  const pa = sum ? Math.round((a / sum) * 100) : 50, pb = 100 - pa;
  const count = pool?.count ?? 0;
  const SideTotal = ({ k, total, pct }: { k: Side; total: number; pct: number }) => (
    <View style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 14, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line, alignItems: k === 'a' ? 'flex-start' : 'flex-end' }}>
      <Row style={{ maxWidth: '100%' }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: sideColor(k), marginRight: 6 }} />
        <Text style={{ color: colors.dim, fontWeight: '700', fontSize: 13.5, flexShrink: 1 }} numberOfLines={1}>{k === 'a' ? m.side_a : m.side_b}</Text>
      </Row>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 4, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
        {pts(total)}<Text style={{ fontSize: 16 }}> 💎</Text>
      </Text>
      <Text style={{ color: sideColor(k), fontSize: 22, fontWeight: '900', marginTop: 2, fontVariant: ['tabular-nums'] }}>{sum ? `${pct}%` : '—'}</Text>
    </View>
  );
  return (
    <Card style={{ marginTop: 12 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>Players’ Predictions</Text>
          <Dim style={{ fontSize: 12.5, marginTop: 2 }}>{pool ? `${pool.players} player${pool.players === 1 ? '' : 's'} · ${count} prediction${count === 1 ? '' : 's'} · ${pts(sum)} 💎 in total` : 'Loading…'}</Dim>
        </View>
        {count ? (
          <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginRight: 4 }}>{open ? 'Hide players' : 'Show players'}</Text>
            {open ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
          </Pressable>
        ) : null}
      </Row>
      <Row style={{ marginTop: 14, alignItems: 'stretch' }}>
        <SideTotal k="a" total={a} pct={pa} />
        <View style={{ width: 30, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.dim, fontWeight: '800', fontSize: 12 }}>VS</Text></View>
        <SideTotal k="b" total={b} pct={pb} />
      </Row>
      <View accessible accessibilityLabel={sum ? `${m.side_a} ${pa}%, ${m.side_b} ${pb}%` : 'No predictions yet'}
        style={{ flexDirection: 'row', marginTop: 12, height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.elevated }}>
        {sum ? (<><View style={{ width: `${pa}%`, height: '100%', backgroundColor: c.a }} /><View style={{ flex: 1, height: '100%', backgroundColor: c.b }} /></>) : null}
      </View>
      <DiffLine m={m} />
      {pool && !count ? <Dim style={{ marginTop: 10 }}>No predictions yet. Be the first!</Dim> : null}
      {open && count ? <Dim style={{ fontSize: 11.5, marginTop: 12 }}>In order of who predicted first. The first player on each side is matched first.</Dim> : null}
      {open && count ? (
        <Row style={{ alignItems: 'flex-start', marginTop: 10 }}>
          {(['a', 'b'] as const).map((k, i) => {
            const col = sideColor(k);
            const list = (pool?.items ?? []).filter((p) => p.side === k);
            return (
              <View key={k} style={{ flex: 1, marginLeft: i ? 10 : 0, borderTopWidth: 2, borderTopColor: col }}>
                {list.length === 0 ? <Dim style={{ fontSize: 12, paddingVertical: 8 }}>No one yet</Dim> : list.map((p) => (
                  <Row key={p.id} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Text style={{ color: p.mine ? c.text : c.dim, fontSize: 13, fontWeight: p.mine ? '800' : '500', flex: 1, marginRight: 4 }} numberOfLines={1}>{p.position ? `${p.position}. ` : ''}{p.name}{p.mine ? ' (you)' : ''}</Text>
                    <Text style={{ color: col, fontSize: 13, fontWeight: '800' }}>{pts(Number(p.amount) + Number(p.unmatched_refund ?? 0))}</Text>
                  </Row>
                ))}
              </View>
            );
          })}
        </Row>
      ) : null}
    </Card>
  );
}

export default function PredictionScreen({ route, navigation }: any) {
  const id: number = route.params.id;
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [side, setSide] = useState<Side | null>(route.params?.side ?? null);
  const [amount, setAmount] = useState('');
  const [reqOpen, setReqOpen] = useState(false);   // request diamonds popup
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [pending, setPending] = useState<Prediction | null>(null);

  const mq = useQuery({ queryKey: ['match', id], queryFn: () => api.get<Match>(`/matches/${id}`), refetchInterval: POLL_MS });
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs') });
  const predictions = useQuery({ queryKey: ['predictions', 'match', id], queryFn: () => api.get<{ data: Prediction[] }>('/predictions'), refetchInterval: POLL_MS });
  const pq = useQuery({ queryKey: ['match-participants', id], queryFn: () => api.get<Participants>(`/matches/${id}/participants`), refetchInterval: POLL_MS });

  const m = mq.data;
  const myClub = clubs.data?.find((x) => x.id === m?.club_id);
  const balance = Number(myClub?.balance ?? 0);
  const mine = (predictions.data?.data ?? []).filter((b) => b.match_id === id && ['confirmed', 'won', 'lost', 'refunded'].includes(b.status));
  const open = !!m?.predictions_open;
  // owners and match agents decide results, so they don't predict on their club's matches
  const canPredict = !!user?.can_predict && open && !m?.can_manage && !myClub?.suspended;   // suspended by the club: can look, not predict
  const amt = Number(amount);
  const max = m?.max_diamonds ? Number(m.max_diamonds) : null;
  const overMax = max != null && amt > max;
  // When changing a prediction its current diamonds are already held, so only new predictions are checked against the balance.
  const overBalance = !editing && amt > balance;
  const limit = Math.floor(Math.min(editing ? Infinity : balance, max ?? Infinity));
  const valid = !!side && amt >= 1 && !overMax && !overBalance;
  const amountRef = useRef<TextInput>(null);
  const pick = (k: Side) => { const first = !side; setSide(k); if (first) setTimeout(() => amountRef.current?.focus(), 250); };   // straight to the amount

  const refreshAll = () => ['predictions', 'match', 'match-participants', 'matches', 'clubs', 'wallets', 'home'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const reset = () => { setEditing(null); setSide(null); setAmount(''); setPending(null); };

  const place = useMutation({
    mutationFn: () => editing ? api.put<Prediction>(`/predictions/${editing.id}`, { side, amount: amt }) : api.post<Prediction>('/predictions', { match_id: id, side, amount: amt }),
    onSuccess: (b) => setPending(b),
    onError: (e) => showAlert('Could not save prediction', errMsg(e)),
  });
  const confirm = useMutation({
    mutationFn: () => api.post<Prediction>(`/predictions/${pending!.id}/confirm`),
    onSuccess: (b) => {
      refreshAll(); reset();
      showAlert('Prediction confirmed', b.matched_amount > 0 ? `Matched ${pts(b.matched_amount)} of ${pts(b.amount)} diamonds.` : 'Waiting for another player to match it.');
    },
    onError: (e) => { showAlert('Not confirmed', errMsg(e)); setPending(null); refreshAll(); },
  });
  const cancelPending = async () => { const p = pending; setPending(null); if (p) { try { await api.del(`/predictions/${p.id}`); } catch {} } refreshAll(); };
  const cancelPrediction = useMutation({
    mutationFn: (b: Prediction) => api.del(`/predictions/${b.id}`),
    onSuccess: () => { refreshAll(); reset(); showAlert('Prediction cancelled', 'Your diamonds were returned.'); },
    onError: (e) => showAlert('Could not cancel', errMsg(e)),
  });

  const name = (s: Side) => (s === 'a' ? m?.side_a : m?.side_b);

  if (mq.isLoading) return <Screen title="Match"><CardSkeleton rows={2} kind="match" /></Screen>;
  if (mq.error || !m) return <Screen title="Match"><ErrorBox error={mq.error ?? new Error('Match not found')} onRetry={() => mq.refetch()} /></Screen>;

  // "You could win …" with the club's multiplier and fees (player vs player: how much matches right away)
  const win = side && valid ? winFor(m, side, amt) : null;
  const step = !side ? 1 : !valid ? 2 : 3;
  const footer = canPredict ? (
    <>
      {editing ? <Dim style={{ textAlign: 'center', marginBottom: 6, fontSize: 12 }}>Changing your prediction on {name(editing.side)} · {pts(editing.amount)} 💎</Dim> : null}
      <Row style={{ gap: 10 }}>
        {editing ? <Button title="Cancel" kind="ghost" onPress={reset} style={{ paddingHorizontal: 18 }} /> : null}
        <View style={{ flex: 1 }}>
          <Button onPress={() => place.mutate()} loading={place.isPending} disabled={!valid}
            title={!side ? 'Pick a team to start' : !(amt >= 1) ? 'Choose your diamonds' : overMax || overBalance ? 'Check the amount' : `${editing ? 'Review change' : 'Predict'} · ${name(side)} · ${pts(amt)} 💎`} />
        </View>
      </Row>
      {side && win ? <Dim style={{ textAlign: 'center', marginTop: 6, fontSize: 12.5, fontWeight: '600' }}>{name(side)} · {pts(amt)} 💎 · could win {win.upTo ? 'up to ' : ''}+{pts(win.gain)} 💎</Dim> : null}
    </>
  ) : undefined;

  return (
    <Screen title={open && !m.can_manage ? 'Make a prediction' : 'Match'} footer={footer} onRefresh={refreshAll} refreshing={mq.isRefetching}>
      {/* Match header */}
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: colors.primarySoft, fontWeight: '700', fontSize: 12.5, flex: 1, marginRight: 8 }} numberOfLines={1}>
          {m.category_icon ? `${m.category_icon} ` : ''}{m.category ?? 'Match'}{m.event ? ` · ${m.event}` : ''}
        </Text>
        <MatchStatusBadge status={m.status} />
      </Row>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 6, letterSpacing: -0.2 }}>{m.title}</Text>
      <View style={{ marginTop: 6 }}><ClubLine m={m} /></View>
      <Row style={{ flexWrap: 'wrap', marginTop: 4 }}>
        <Fact text={m.mode === 'club' ? 'Club multiplier' : 'Player vs player'} />
        {max ? <Fact text={`Max ${pts(max)} 💎`} /> : null}
        {m.scheduled_at ? <Fact text={whenShort(m.scheduled_at)} /> : null}
      </Row>
      {m.live_video ? <MatchVideo video={m.live_video} /> : null}
      {m.can_manage && ['open', 'paused', 'closed'].includes(m.status) ? <ClubControls m={m} onDone={refreshAll} /> : null}

      {/* Step 1: pick a side */}
      {canPredict ? <Steps at={step} /> : null}
      {canPredict ? <SectionHeader small title={editing ? '1. Change your pick' : '1. Pick who wins'} /> : <View style={{ height: spacing.lg }} />}
      <Row style={{ alignItems: 'stretch' }}>
        <SidePicker m={m} k="a" selected={side === 'a'} canPick={canPredict} onPick={() => pick('a')} />
        <View style={{ width: 30, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.dim, fontWeight: '800', fontSize: 12 }}>VS</Text></View>
        <SidePicker m={m} k="b" selected={side === 'b'} canPick={canPredict} onPick={() => pick('b')} />
      </Row>
      {Number(m.my_diamonds ?? 0) > 0 ? <Dim style={{ marginTop: 10, textAlign: 'center' }}>You have <T style={{ fontWeight: '800', color: colors.primarySoft }}>{pts(m.my_diamonds ?? 0)} 💎</T> on this match</Dim> : null}

      {/* Result */}
      {m.status === 'settled' ? (() => {
        const won = mine.filter((b) => b.status === 'won');
        const lost = mine.filter((b) => b.status === 'lost');
        const back = mine.filter((b) => b.status === 'refunded');
        const winner = m.result === 'a' ? m.side_a : m.result === 'b' ? m.side_b : null;
        return (
          <Card style={{ marginTop: 14, borderColor: won.length ? c.good : c.line, backgroundColor: won.length ? colors.success + '12' : colors.card }}>
            <T style={{ fontWeight: '800', fontSize: 17 }}>{winner ? `🏆 ${winner} won` : m.result === 'draw' ? 'Draw' : 'Match cancelled'}</T>
            {won.length ? <T style={{ color: c.good, marginTop: 6, fontWeight: '800', fontSize: 16 }}>🎉 You won {pts(won.reduce((a, b) => a + Number(b.reward), 0))} 💎</T> : null}
            {lost.length && !won.length ? <T style={{ color: c.dim, marginTop: 6 }}>Your prediction did not win this time. {pts(lost.reduce((a, b) => a + Number(b.matched_amount), 0))} 💎 used.</T> : null}
            {back.length ? <T style={{ marginTop: 6 }}>↩️ {pts(back.reduce((a, b) => a + Number(b.reward), 0))} 💎 returned to you</T> : null}
            {mine.length === 0 ? <Dim style={{ marginTop: 6 }}>You had no predictions on this match.</Dim> : null}
          </Card>
        );
      })() : null}

      {/* Why the player can't predict right now */}
      {myClub?.suspended && open && !m.can_manage ? <SuspendedNotice club={myClub} style={{ marginTop: 14 }} />
      : !user?.can_predict && open && !m.can_manage ? (
        <Card style={{ marginTop: 14, borderColor: c.warn }}>
          <T style={{ fontWeight: '800' }}>Verify your account to predict</T>
          <Dim style={{ marginTop: 2 }}>Confirm your email and ID. Takes about 2 minutes.</Dim>
          <Button title="Verify now" small style={{ marginTop: 10 }} onPress={() => navigation.navigate('Verify')} />
        </Card>
      ) : !open && m.status !== 'settled' ? (
        <Card style={{ marginTop: 14 }}>
          <T style={{ fontWeight: '700' }}>{m.status === 'paused' ? 'Predictions are paused' : m.status === 'upcoming' ? 'Predictions open soon' : m.status === 'closed' ? 'Live now · predictions are closed' : 'Predictions are closed'}</T>
          <Dim style={{ marginTop: 2 }}>{m.status === 'upcoming' ? (m.scheduled_at ? `This match starts ${whenShort(m.scheduled_at)}. ` : '') + 'Pull down to refresh.' : m.status === 'paused' ? 'The club paused this match for a moment. Pull down to refresh.' : 'Results show here once the club settles the match.'}</Dim>
        </Card>
      ) : null}

      {/* Step 2: amount */}
      {canPredict ? (
        <>
          <SectionHeader small title="2. Choose your diamonds" />
          <Card>
            <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <Dim>Available in {m.club}</Dim>
              <T style={{ fontWeight: '800' }}>{pts(balance)} 💎</T>
            </Row>
            <Row style={{ backgroundColor: colors.bg2, borderRadius: radius.md, borderWidth: 1.5, borderColor: overMax || overBalance ? colors.danger : amt >= 1 ? colors.primary : colors.line, paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 22 }}>💎</Text>
              <TextInput ref={amountRef} value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.dim}
                accessibilityLabel="Diamonds to predict" returnKeyType="done"
                style={{ flex: 1, color: colors.text, fontSize: 22, fontWeight: '800', paddingVertical: 10, marginLeft: 10 }} />
              {amount ? <Pressable onPress={() => setAmount('')} hitSlop={10} accessibilityLabel="Clear amount"><Text style={{ color: colors.dim, fontWeight: '700' }}>Clear</Text></Pressable> : null}
            </Row>
            <Row style={{ marginTop: 10, flexWrap: 'wrap', rowGap: 8 }}>
              {QUICK.filter((q) => q !== limit).map((q) => <Chip key={q} label={String(q)} active={amt === q} disabled={q > limit} onPress={() => setAmount(String(q))} />)}
              {limit >= 1 && Number.isFinite(limit) ? <Chip label={`Max ${pts(limit)}`} active={amt === limit} onPress={() => setAmount(String(limit))} /> : null}
            </Row>
            {overMax ? <FieldError text={`The most you can use on this match is ${pts(max)} 💎.`} /> : null}
            {overBalance && !overMax ? (
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}><FieldError text={`You only have ${pts(balance)} 💎 here.`} /></View>
                <Pressable onPress={() => setReqOpen(true)} hitSlop={8} style={{ marginTop: 6 }}><Text style={{ color: colors.primarySoft, fontWeight: '800' }}>Get diamonds</Text></Pressable>
              </Row>
            ) : null}
            {win && side ? (
              <View accessibilityLiveRegion="polite" style={{ marginTop: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.success + '14', borderWidth: 1, borderColor: colors.success + '55' }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T>If {name(side)} win</T>
                  <T style={{ color: colors.success, fontWeight: '800', fontSize: 16 }}>{win.upTo ? 'up to ' : ''}+{pts(win.gain)} 💎</T>
                </Row>
                <Dim style={{ fontSize: 12.5, marginTop: 3 }}>You get {pts(win.back)} 💎 back in total{win.fee > 0 ? ` (after ${pts(win.fee)}% fees)` : ''}.</Dim>
                {win.note ? <Dim style={{ fontSize: 12.5, marginTop: 3 }}>{win.note}</Dim> : null}
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* My predictions */}
      {mine.length > 0 ? <SectionHeader small title="My predictions" /> : null}
      {mine.map((b) => (
        <Card key={b.id} style={{ borderLeftWidth: 3, borderLeftColor: sideColor(b.side) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontWeight: '800', flex: 1, marginRight: 8 }} numberOfLines={1}>{name(b.side)} · {pts(b.original_amount ?? b.amount)} 💎</T>
            <Badge text={b.status} />
          </Row>
          <Dim style={{ marginTop: 2 }}>
            {b.status === 'won' ? `Won +${pts(b.reward)} 💎` : b.status === 'lost' ? `${pts(b.matched_amount)} 💎 used` : b.status === 'refunded' ? 'Diamonds returned'
              : Number(b.matched_amount) >= Number(b.original_amount ?? b.amount) ? 'Fully matched'
              : Number(b.unmatched_refund) > 0 ? `Matched ${pts(b.matched_amount)} of ${pts(b.original_amount ?? b.amount)}` : `Matched ${pts(b.matched_amount)} of ${pts(b.amount)} · waiting for players`}
          </Dim>
          {b.matched_with?.length ? (
            <Text style={{ color: c.text, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
              <Text style={{ color: c.dim }}>Matched with </Text>
              {b.matched_with.map((x, i) => <Text key={i}>{i ? ', ' : ''}<Text style={{ fontWeight: '800' }}>{x.name}</Text> {pts(x.amount)} 💎</Text>)}
            </Text>
          ) : null}
          {Number(b.unmatched_refund) > 0 ? <Dim style={{ marginTop: 4 }}>↩️ {pts(b.unmatched_refund)} 💎 not matched · returned to you</Dim> : null}
        </Card>
      ))}

      <PoolCard m={m} pool={pq.data} />

      {/* Confirm sheet */}
      <Modal visible={!!pending} transparent animationType="slide" onRequestClose={cancelPending}>
        <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, paddingBottom: 34, borderWidth: 1, borderColor: colors.line }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }} />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Confirm your prediction</Text>
            <Dim style={{ marginTop: 4 }} numberOfLines={2}>{m.title}</Dim>
            <View style={{ backgroundColor: colors.bg2, borderRadius: radius.md, padding: 14, marginTop: 14, borderWidth: 1, borderColor: colors.line }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Dim>Your pick</Dim>
                <T style={{ fontWeight: '800', color: pending ? sideColor(pending.side) : c.text, flexShrink: 1, marginLeft: 12 }} numberOfLines={1}>{pending ? name(pending.side) : ''}</T>
              </Row>
              <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
                <Dim>Diamonds</Dim>
                <T style={{ fontWeight: '800' }}>{pts(pending?.amount)} 💎</T>
              </Row>
              {pending ? (() => { const w = winFor(m, pending.side, Number(pending.amount)); return (
                <Row style={{ justifyContent: 'space-between', marginTop: 10 }}>
                  <Dim>If {name(pending.side)} win</Dim>
                  <T style={{ fontWeight: '800', color: colors.success }}>{w.upTo ? 'up to ' : ''}+{pts(w.gain)} 💎</T>
                </Row>); })() : null}
            </View>
            <View style={{ marginTop: 12, marginBottom: 16, padding: 12, borderRadius: radius.md, backgroundColor: '#F59E0B14', borderWidth: 1, borderColor: '#F59E0B55' }}>
              <T style={{ fontSize: 13.5, lineHeight: 19 }}><T style={{ fontWeight: '800' }}>This is final. </T>Once you confirm, the diamonds are used and this prediction can’t be cancelled or changed.</T>
            </View>
            <Button title="Confirm prediction" onPress={() => confirm.mutate()} loading={confirm.isPending} />
            <Button title="Go back" kind="ghost" style={{ marginTop: 10 }} onPress={cancelPending} disabled={confirm.isPending} />
          </View>
        </View>
      </Modal>
      {reqOpen ? <RequestDiamondsSheet clubId={m.club_id} onClose={() => setReqOpen(false)} /> : null}
    </Screen>
  );
}
