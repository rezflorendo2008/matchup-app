import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { POLL_MS } from '../config';
import { useAuth } from '../store';
import { Badge, Button, Card, CardSkeleton, Chip, Dim, ErrorBox, MatchStatusBadge, PressScale, Row, Screen, SectionHeader, T, TeamAvatar, c, pts, whenShort } from '../ui';
import { ClubLine } from '../components/MatchCards';
import { MatchVideo } from '../components/MatchVideo';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from '../icons';
import { colors, radius, spacing } from '../theme';
import type { Prediction, Club, Match } from '../types';

type Side = 'a' | 'b';
type Participants = { total: number; total_a: number; total_b: number; count: number; players: number;
  items: { id: number; name: string; side: Side; amount: number; mine: boolean; status: string }[] };

const sideColor = (k: Side) => (k === 'a' ? c.a : c.b);
const QUICK = [10, 50, 100, 500];

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
function PoolCard({ m, pool }: { m: Match; pool?: Participants }) {
  const [open, setOpen] = useState(false);
  const a = Number(pool?.total_a ?? 0), b = Number(pool?.total_b ?? 0), sum = a + b;
  const pa = sum ? Math.round((a / sum) * 100) : 50;
  return (
    <Card style={{ marginTop: 12 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={6}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '800' }}>Who predicted what</T>
            <Dim style={{ fontSize: 12, marginTop: 2 }}>{pool ? `${pool.players} player${pool.players === 1 ? '' : 's'} · ${pool.count} prediction${pool.count === 1 ? '' : 's'}` : 'Loading…'}</Dim>
          </View>
          {open ? <ChevronDownIcon size={20} /> : <ChevronRightIcon size={20} />}
        </Row>
        <Row style={{ marginTop: 12, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.bg2 }}>
          {sum ? (
            <>
              <View style={{ width: `${pa}%`, height: '100%', backgroundColor: c.a }} />
              <View style={{ flex: 1, height: '100%', backgroundColor: c.b }} />
            </>
          ) : null}
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ color: c.a, fontSize: 12, fontWeight: '800', flex: 1 }} numberOfLines={1}>{m.side_a} · {pts(a)} 💎{sum ? ` (${pa}%)` : ''}</Text>
          <Text style={{ color: c.b, fontSize: 12, fontWeight: '800', flex: 1, textAlign: 'right' }} numberOfLines={1}>{sum ? `(${100 - pa}%) ` : ''}{pts(b)} 💎 · {m.side_b}</Text>
        </Row>
      </Pressable>
      {open ? (
        <Row style={{ alignItems: 'flex-start', marginTop: 10 }}>
          {(['a', 'b'] as const).map((k, i) => {
            const col = sideColor(k);
            const list = (pool?.items ?? []).filter((p) => p.side === k);
            return (
              <View key={k} style={{ flex: 1, marginLeft: i ? 10 : 0 }}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 160, borderTopWidth: 2, borderTopColor: col }}>
                  {list.length === 0 ? <Dim style={{ fontSize: 12, paddingVertical: 8 }}>{pool ? 'No one yet' : 'Loading…'}</Dim> : list.map((p) => (
                    <Row key={p.id} style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
                      <Text style={{ color: p.mine ? c.text : c.dim, fontSize: 12, fontWeight: p.mine ? '800' : '500', flex: 1, marginRight: 4 }} numberOfLines={1}>{p.name}{p.mine ? ' (you)' : ''}</Text>
                      <Text style={{ color: col, fontSize: 12, fontWeight: '700' }}>{pts(p.amount)}</Text>
                    </Row>
                  ))}
                </ScrollView>
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
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [pending, setPending] = useState<Prediction | null>(null);

  const mq = useQuery({ queryKey: ['match', id], queryFn: () => api.get<Match>(`/matches/${id}`), refetchInterval: POLL_MS });
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs') });
  const predictions = useQuery({ queryKey: ['predictions', 'match', id], queryFn: () => api.get<{ data: Prediction[] }>('/predictions'), refetchInterval: POLL_MS });
  const pq = useQuery({ queryKey: ['match-participants', id], queryFn: () => api.get<Participants>(`/matches/${id}/participants`), refetchInterval: POLL_MS });

  const m = mq.data;
  const balance = Number(clubs.data?.find((x) => x.id === m?.club_id)?.balance ?? 0);
  const mine = (predictions.data?.data ?? []).filter((b) => b.match_id === id && ['confirmed', 'won', 'lost', 'refunded'].includes(b.status));
  const open = !!m?.predictions_open;
  const canPredict = !!user?.can_predict && open;
  const amt = Number(amount);
  const max = m?.max_diamonds ? Number(m.max_diamonds) : null;
  const overMax = max != null && amt > max;
  // When changing a prediction its current diamonds are already held, so only new predictions are checked against the balance.
  const overBalance = !editing && amt > balance;
  const limit = Math.floor(Math.min(editing ? Infinity : balance, max ?? Infinity));
  const valid = !!side && amt >= 1 && !overMax && !overBalance;

  const refreshAll = () => ['predictions', 'match', 'match-participants', 'matches', 'clubs', 'wallets', 'home'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const reset = () => { setEditing(null); setSide(null); setAmount(''); setPending(null); };

  const place = useMutation({
    mutationFn: () => editing ? api.put<Prediction>(`/predictions/${editing.id}`, { side, amount: amt }) : api.post<Prediction>('/predictions', { match_id: id, side, amount: amt }),
    onSuccess: (b) => setPending(b),
    onError: (e) => Alert.alert('Could not save prediction', errMsg(e)),
  });
  const confirm = useMutation({
    mutationFn: () => api.post<Prediction>(`/predictions/${pending!.id}/confirm`),
    onSuccess: (b) => {
      refreshAll(); reset();
      Alert.alert('Prediction confirmed', b.matched_amount > 0 ? `Matched ${pts(b.matched_amount)} of ${pts(b.amount)} diamonds.` : 'Waiting for another player. You can cancel or change it until it is matched.');
    },
    onError: (e) => { Alert.alert('Not confirmed', errMsg(e)); setPending(null); refreshAll(); },
  });
  const cancelPending = async () => { const p = pending; setPending(null); if (p) { try { await api.del(`/predictions/${p.id}`); } catch {} } refreshAll(); };
  const cancelPrediction = useMutation({
    mutationFn: (b: Prediction) => api.del(`/predictions/${b.id}`),
    onSuccess: () => { refreshAll(); reset(); Alert.alert('Prediction cancelled', 'Your diamonds were returned.'); },
    onError: (e) => Alert.alert('Could not cancel', errMsg(e)),
  });

  const name = (s: Side) => (s === 'a' ? m?.side_a : m?.side_b);

  if (mq.isLoading) return <Screen title="Match"><CardSkeleton rows={2} kind="match" /></Screen>;
  if (mq.error || !m) return <Screen title="Match"><ErrorBox error={mq.error ?? new Error('Match not found')} onRetry={() => mq.refetch()} /></Screen>;

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
    </>
  ) : undefined;

  return (
    <Screen title={open ? 'Make a prediction' : 'Match'} footer={footer} onRefresh={refreshAll} refreshing={mq.isRefetching}>
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

      {/* Step 1: pick a side */}
      {canPredict ? <SectionHeader small title={editing ? '1. Change your pick' : '1. Pick who wins'} /> : <View style={{ height: spacing.lg }} />}
      <Row style={{ alignItems: 'stretch' }}>
        <SidePicker m={m} k="a" selected={side === 'a'} canPick={canPredict} onPick={() => setSide('a')} />
        <View style={{ width: 30, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.dim, fontWeight: '800', fontSize: 12 }}>VS</Text></View>
        <SidePicker m={m} k="b" selected={side === 'b'} canPick={canPredict} onPick={() => setSide('b')} />
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
      {!user?.can_predict && open ? (
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
              <TextInput value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.dim}
                accessibilityLabel="Diamonds to predict" returnKeyType="done"
                style={{ flex: 1, color: colors.text, fontSize: 22, fontWeight: '800', paddingVertical: 10, marginLeft: 10 }} />
              {amount ? <Pressable onPress={() => setAmount('')} hitSlop={10} accessibilityLabel="Clear amount"><Text style={{ color: colors.dim, fontWeight: '700' }}>Clear</Text></Pressable> : null}
            </Row>
            <Row style={{ marginTop: 10, flexWrap: 'wrap', rowGap: 8 }}>
              {QUICK.map((q) => <Chip key={q} label={String(q)} active={amt === q} disabled={q > limit} onPress={() => setAmount(String(q))} />)}
              {limit >= 1 && Number.isFinite(limit) ? <Chip label={`Max ${pts(limit)}`} active={amt === limit} onPress={() => setAmount(String(limit))} /> : null}
            </Row>
            {overMax ? <Dim style={{ color: colors.danger, marginTop: 10 }}>The most you can use on this match is {pts(max)} 💎.</Dim> : null}
            {overBalance && !overMax ? (
              <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
                <Dim style={{ color: colors.danger, flex: 1, marginRight: 8 }}>You only have {pts(balance)} 💎 here.</Dim>
                <Pressable onPress={() => navigation.navigate('AddDiamonds')} hitSlop={8}><Text style={{ color: colors.primarySoft, fontWeight: '800' }}>Get diamonds</Text></Pressable>
              </Row>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* My predictions */}
      {mine.length > 0 ? <SectionHeader small title="My predictions" /> : null}
      {mine.map((b) => (
        <Card key={b.id} style={{ borderLeftWidth: 3, borderLeftColor: sideColor(b.side) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontWeight: '800', flex: 1, marginRight: 8 }} numberOfLines={1}>{name(b.side)} · {pts(b.amount)} 💎</T>
            <Badge text={b.status} />
          </Row>
          <Dim style={{ marginTop: 2 }}>
            {b.status === 'won' ? `Won +${pts(b.reward)} 💎` : b.status === 'lost' ? `${pts(b.matched_amount)} 💎 used` : b.status === 'refunded' ? 'Diamonds returned'
              : Number(b.matched_amount) >= Number(b.amount) ? 'Fully matched' : `Matched ${pts(b.matched_amount)} of ${pts(b.amount)} · waiting for players`}
          </Dim>
          {b.can_edit && open ? (
            <Row style={{ marginTop: 10, gap: 8 }}>
              <Button style={{ flex: 1 }} small kind="ghost" title={editing?.id === b.id ? 'Editing…' : 'Change'} disabled={editing?.id === b.id}
                onPress={() => { setEditing(b); setSide(b.side); setAmount(String(b.amount)); }} />
              <Button style={{ flex: 1 }} small kind="ghost" title="Cancel" loading={cancelPrediction.isPending && cancelPrediction.variables?.id === b.id}
                onPress={() => Alert.alert('Cancel this prediction?', 'Your diamonds will be returned.', [{ text: 'Keep it', style: 'cancel' }, { text: 'Cancel prediction', style: 'destructive', onPress: () => cancelPrediction.mutate(b) }])} />
            </Row>
          ) : null}
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
            </View>
            <Dim style={{ marginTop: 12, marginBottom: 16 }}>
              The diamonds are used now. You can cancel or change an unmatched prediction while predictions are open.{editing ? ' Your previous prediction is replaced only when you confirm.' : ''}
            </Dim>
            <Button title="Confirm prediction" onPress={() => confirm.mutate()} loading={confirm.isPending} />
            <Button title="Go back" kind="ghost" style={{ marginTop: 10 }} onPress={cancelPending} disabled={confirm.isPending} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
