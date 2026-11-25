import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { POLL_MS } from '../config';
import { useAuth } from '../store';
import { Badge, Button, Card, Chip, Dim, CardSkeleton, ErrorBox, Field, H1, H2, Loading, MatchStatusBadge, Row, Screen, T, TeamAvatar, c, pts } from '../ui';
import { ScrollView, Text } from 'react-native';
import type { Prediction, Club, Match } from '../types';

type Participants = { total: number; total_a: number; total_b: number; count: number; players: number;
  items: { id: number; name: string; side: 'a' | 'b'; amount: number; mine: boolean; status: string }[] };

export default function PredictionScreen({ route, navigation }: any) {
  const id: number = route.params.id;
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [side, setSide] = useState<'a' | 'b' | null>(route.params?.side ?? null);
  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [pending, setPending] = useState<Prediction | null>(null);
  const [showPool, setShowPool] = useState(false);

  const mq = useQuery({ queryKey: ['match', id], queryFn: () => api.get<Match>(`/matches/${id}`), refetchInterval: POLL_MS });
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs') });
  const predictions = useQuery({ queryKey: ['predictions', 'match', id], queryFn: () => api.get<{ data: Prediction[] }>('/predictions'), refetchInterval: POLL_MS });

  const pq = useQuery({ queryKey: ['match-participants', id], queryFn: () => api.get<Participants>(`/matches/${id}/participants`), refetchInterval: POLL_MS });
  const pool = pq.data;

  const m = mq.data;
  const balance = clubs.data?.find((x) => x.id === m?.club_id)?.balance ?? 0;
  const mine = (predictions.data?.data ?? []).filter((b) => b.match_id === id && ['confirmed', 'won', 'lost', 'refunded'].includes(b.status));
  const open = !!m?.predictions_open;
  const amt = Number(amount);
  const valid = !!side && amt >= 1 && (!m?.max_diamonds || amt <= Number(m.max_diamonds));

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

  const name = (s: 'a' | 'b') => (s === 'a' ? m?.side_a : m?.side_b);

  if (mq.isLoading) return <Screen><CardSkeleton rows={2} kind="match" /></Screen>;
  if (mq.error || !m) return <Screen><ErrorBox error={mq.error ?? new Error('Match not found')} onRetry={() => mq.refetch()} /></Screen>;

  return (
    <Screen edges={['top', 'bottom']}>
      <Button title="‹ Back" kind="ghost" onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, marginBottom: 10 }} />
      <Dim>{m.category ?? 'Match'} · {m.club}</Dim>
      <H1>{m.title}</H1>
      <Row style={{ marginBottom: 12 }}><MatchStatusBadge status={m.status} /><Dim style={{ marginLeft: 10 }}>{m.mode === 'club' ? 'Club multiplier' : 'Player vs player'}{m.max_diamonds ? ` · max ${pts(m.max_diamonds)}` : ''}</Dim></Row>

      <Row style={{ alignItems: 'stretch', marginBottom: 4 }}>
        {(['a', 'b'] as const).map((k) => {
          const sel = side === k; const col = k === 'a' ? c.a : c.b;
          const card = (
            <Card key={k} onPress={open ? () => setSide(k) : undefined}
              style={{ flex: 1, marginBottom: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderColor: sel ? col : c.line, borderWidth: sel ? 2 : 1, backgroundColor: sel ? col + '1A' : c.card }}>
              <TeamAvatar name={name(k) ?? ''} color={col} size={56} />
              {m.has_score && (m.score_a != null || m.score_b != null) ? <Text style={{ color: c.text, fontWeight: '800', fontSize: 34, marginTop: 6 }}>{(k === 'a' ? m.score_a : m.score_b) ?? 0}</Text> : null}
              <Text style={{ color: c.text, fontWeight: '800', fontSize: 16, marginTop: 10, textAlign: 'center' }} numberOfLines={2}>{name(k)}</Text>
              <Text style={{ color: col, fontWeight: '700', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                {m.mode === 'club' ? `×${k === 'a' ? m.multiplier_a ?? '-' : m.multiplier_b ?? '-'}` : `${pts(k === 'a' ? m.open_a : m.open_b)} 💎 open`}
              </Text>
              {m.result === k ? <View style={{ marginTop: 8 }}><Badge text="won" /></View> : null}
              {sel && open ? <Text style={{ color: col, fontSize: 12, fontWeight: '800', marginTop: 8 }}>SELECTED</Text> : null}
            </Card>
          );
          return k === 'a' ? <React.Fragment key={k}>{card}<View style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.dim, fontWeight: '800' }}>VS</Text></View></React.Fragment> : card;
        })}
      </Row>

      {Number(m.my_diamonds ?? 0) > 0 ? <Dim style={{ marginTop: 10, textAlign: 'center' }}>You have <T style={{ fontWeight: '800', color: c.brand }}>{pts(m.my_diamonds ?? 0)} 💎</T> on this match</Dim> : null}

      {m.status === 'settled' ? (() => {
        const won = mine.filter((b) => b.status === 'won');
        const lost = mine.filter((b) => b.status === 'lost');
        const back = mine.filter((b) => b.status === 'refunded');
        const winner = m.result === 'a' ? m.side_a : m.result === 'b' ? m.side_b : null;
        return (
          <Card style={{ marginTop: 12, borderColor: won.length ? c.good : c.line }}>
            <T style={{ fontWeight: '800', fontSize: 16 }}>{winner ? `🏆 ${winner} won` : m.result === 'draw' ? 'Draw' : 'Match cancelled'}</T>
            {won.length ? <T style={{ color: c.good, marginTop: 6, fontWeight: '700' }}>🎉 You won {pts(won.reduce((a, b) => a + Number(b.reward), 0))} 💎</T> : null}
            {lost.length && !won.length ? <T style={{ color: c.dim, marginTop: 6 }}>Your prediction did not win this time. {pts(lost.reduce((a, b) => a + Number(b.matched_amount), 0))} 💎 used.</T> : null}
            {back.length ? <T style={{ marginTop: 6 }}>↩️ {pts(back.reduce((a, b) => a + Number(b.reward), 0))} 💎 returned to you</T> : null}
            {mine.length === 0 ? <Dim style={{ marginTop: 6 }}>You had no predictions on this match.</Dim> : null}
          </Card>
        );
      })() : null}

      {!user?.can_predict ? (
        <Card style={{ borderColor: c.warn }}><T>Verify your account to make predictions.</T><Button title="Verify now" style={{ marginTop: 10 }} onPress={() => navigation.navigate('Verify')} /></Card>
      ) : !open ? (
        <Card><Dim>Predictions are {m.status === 'paused' ? 'paused' : m.status === 'upcoming' ? 'not open yet' : 'closed'} for this match.</Dim></Card>
      ) : (
        <>
          <H2>{editing ? `Change prediction #${editing.id}` : 'Make your prediction'}</H2>
          <Card>
            <Row style={{ marginBottom: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: side ? c.good : c.brand, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{side ? '✓' : '1'}</Text></View>
              <T style={{ fontWeight: '700', flex: 1 }}>{side ? `You picked ${name(side)}` : 'Tap a team above to pick a side'}</T>
            </Row>
            <Row style={{ marginBottom: 6 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>2</Text></View>
              <T style={{ fontWeight: '700', flex: 1 }}>Choose diamonds</T>
              <Dim>You have {pts(balance)} 💎</Dim>
            </Row>
            <Field label="" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
            <Row style={{ marginBottom: 12 }}>
              {[10, 50, 100, 500].map((q) => <Chip key={q} label={String(q)} active={amt === q} onPress={() => setAmount(String(q))} />)}
              {Number(balance) > 0 ? <Chip label="Max" onPress={() => setAmount(String(m.max_diamonds ? Math.min(Number(balance), Number(m.max_diamonds)) : Math.floor(Number(balance))))} /> : null}
            </Row>
            <Button title={editing ? 'Review change' : valid ? `Predict ${name(side!)} · ${pts(amt)} 💎` : 'Predict'} onPress={() => place.mutate()} loading={place.isPending} disabled={!valid} />
            {editing ? <Button title="Stop editing" kind="ghost" style={{ marginTop: 8 }} onPress={reset} /> : null}
            {amt > balance && valid ? <Row style={{ marginTop: 10 }}><Dim style={{ color: c.warn, flex: 1 }}>You don't have enough diamonds for this.</Dim><Button title="Request diamonds" kind="ghost" style={{ paddingVertical: 8, paddingHorizontal: 14 }} onPress={() => navigation.navigate('AddDiamonds')} /></Row> : null}
          </Card>
        </>
      )}

      {mine.length > 0 ? <H2>My predictions on this match</H2> : null}
      {mine.map((b) => (
        <Card key={b.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={{ fontWeight: '700' }}>{name(b.side)} · {pts(b.amount)}</T><Badge text={b.status} />
          </Row>
          <Dim>Matched {pts(b.matched_amount)}{b.status === 'won' ? ` · Won +${pts(b.reward)} 💎` : b.status === 'lost' ? ` · Lost · ${pts(b.matched_amount)} 💎 used` : ''}</Dim>
          {b.can_edit && open ? (
            <Row style={{ marginTop: 10, gap: 8 }}>
              <Button style={{ flex: 1 }} kind="ghost" title="Change" onPress={() => { setEditing(b); setSide(b.side); setAmount(String(b.amount)); }} />
              <Button style={{ flex: 1 }} kind="danger" title="Cancel" loading={cancelPrediction.isPending && cancelPrediction.variables?.id === b.id}
                onPress={() => Alert.alert('Cancel this prediction?', 'Your diamonds will be returned.', [{ text: 'Keep it', style: 'cancel' }, { text: 'Cancel prediction', style: 'destructive', onPress: () => cancelPrediction.mutate(b) }])} />
            </Row>
          ) : null}
        </Card>
      ))}

      <Card style={{ marginTop: 12 }} onPress={() => setShowPool(!showPool)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View><T style={{ fontWeight: '800' }}>Who predicted what</T>
          <Dim style={{ fontSize: 12, marginTop: 2 }}>{pool ? `${pool.players} player${pool.players === 1 ? '' : 's'} · ${pool.count} prediction${pool.count === 1 ? '' : 's'}` : 'Loading…'}</Dim></View>
          <Dim>{showPool ? 'Hide' : 'Show'}</Dim>
        </Row>
        {showPool ? <Row style={{ alignItems: 'flex-start', marginTop: 8 }}>
          {(['a', 'b'] as const).map((k, i) => {
            const col = k === 'a' ? c.a : c.b;
            const list = (pool?.items ?? []).filter((p) => p.side === k);
            return (
              <View key={k} style={{ flex: 1, marginLeft: i ? 10 : 0 }}>
                <Text style={{ color: col, fontSize: 12, fontWeight: '800' }} numberOfLines={1}>{k === 'a' ? m.side_a : m.side_b} ({list.length})</Text>
                <Text style={{ color: col, fontSize: 13, fontWeight: '800', marginTop: 2 }}>{pts(k === 'a' ? pool?.total_a ?? 0 : pool?.total_b ?? 0)} 💎 total</Text>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 130, marginTop: 4, borderTopWidth: 2, borderTopColor: col }} showsVerticalScrollIndicator>
                  {list.length === 0 ? <Dim style={{ fontSize: 11, paddingVertical: 6 }}>{pool ? 'No one yet' : 'Loading…'}</Dim> : list.map((p) => (
                    <Row key={p.id} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ color: p.mine ? c.text : c.dim, fontSize: 11, fontWeight: p.mine ? '800' : '500', flex: 1, marginRight: 4 }} numberOfLines={1}>{p.name}{p.mine ? ' (you)' : ''}</Text>
                      <Text style={{ color: col, fontSize: 11, fontWeight: '700' }}>{pts(p.amount)} 💎</Text>
                    </Row>
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </Row> : null}
      </Card>

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={cancelPending}>
        <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: 24 }}>
          <Card style={{ padding: 20 }}>
            <H2 style={{ marginTop: 0 }}>Confirm your prediction</H2>
            <T>{m.title}</T>
            <Dim style={{ marginVertical: 8 }}>You are predicting with <T style={{ fontWeight: '800' }}>{pts(pending?.amount)} diamonds</T> on <T style={{ fontWeight: '800', color: pending?.side === 'a' ? c.a : c.b }}>{pending ? name(pending.side) : ''}</T>.
              {editing ? ' Your previous prediction is replaced only when you confirm.' : ''}</Dim>
            <Dim style={{ marginBottom: 14 }}>The diamonds are used now. You can cancel or change an unmatched prediction while predictions are open.</Dim>
            <Button title="Confirm prediction" onPress={() => confirm.mutate()} loading={confirm.isPending} />
            <Button title="Go back" kind="ghost" style={{ marginTop: 10 }} onPress={cancelPending} disabled={confirm.isPending} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
