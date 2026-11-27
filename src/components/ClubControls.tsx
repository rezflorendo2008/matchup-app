import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { Button, Card, Chip, Dim, Row, T, c, pts } from '../ui';
import { CheckIcon } from '../icons';
import { colors, radius } from '../theme';
import type { Match } from '../types';
import { showAlert } from '../dialog';

type Result = 'a' | 'b' | 'draw' | 'cancel';
type Preview = {
  winners: number; winner_players: number; paid_out: number; fees: number; losers: number; loser_players: number; lost: number;
  unmatched_returned: number; refunded: number; refund_players: number; score_warning: boolean; score_warning_text?: string | null; score: { a: number; b: number } | null;
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const d = (n: number | string) => `${pts(n)} 💎`;

/** Club owner / match agent: close predictions and set the winner from the match page. Players never see this. */
export function ClubControls({ m, onDone }: { m: Match; onDone: () => void }) {
  const [settling, setSettling] = useState(false);
  const close = useMutation({
    mutationFn: () => api.post<Match>(`/matches/${m.id}/close`),
    onSuccess: () => { onDone(); showAlert('Predictions closed', 'Unmatched diamonds went back to the players. Set the winner when the match ends.'); },
    onError: (e) => showAlert('Could not close', errMsg(e)),
  });
  const askClose = () => showAlert('Close predictions?',
    `Players can no longer predict on "${m.title}". Diamonds that were never matched go back to the players. Set the winner when the match ends.`,
    [{ text: 'Keep open', style: 'cancel' }, { text: 'Close predictions', style: 'destructive', onPress: () => close.mutate() }]);

  return (
    <Card style={{ marginTop: 14, borderColor: colors.primary + '66' }}>
      <T style={{ fontWeight: '800' }}>🛠 Club controls</T>
      <Dim style={{ fontSize: 12, marginTop: 2 }}>Only you and your agents see this</Dim>
      <ScoreEditor m={m} />
      <Row style={{ marginTop: 12, gap: 8 }}>
        {m.status === 'open' || m.status === 'paused'
          ? <Button style={{ flex: 1 }} small kind="ghost" title="Close predictions" loading={close.isPending} onPress={askClose} />
          : null}
        <Button style={{ flex: 1 }} small kind="danger" title="Set winner" onPress={() => setSettling(true)} />
      </Row>
      {settling ? <SettleSheet m={m} onClose={() => setSettling(false)} onDone={() => { setSettling(false); onDone(); }} /> : null}
    </Card>
  );
}

/** Live score: each tap saves straight away; players see it on their next refresh. */
function ScoreEditor({ m }: { m: Match }) {
  const [score, setScore] = useState({ a: Number(m.score_a ?? 0), b: Number(m.score_b ?? 0) });
  const [note, setNote] = useState('Tap + or − to update the score. Players see it live.');
  const pending = useRef(0), seq = useRef(0);
  // follow changes made elsewhere (another agent, the owner console) unless a save of ours is on its way
  useEffect(() => { if (pending.current === 0) setScore({ a: Number(m.score_a ?? 0), b: Number(m.score_b ?? 0) }); }, [m.score_a, m.score_b]);
  const save = async (next: { a: number; b: number }) => {
    const mine = ++seq.current; pending.current++; setNote('Saving…');
    try { await api.post(`/matches/${m.id}/score`, { score_a: next.a, score_b: next.b }); if (mine === seq.current) setNote(`Saved · ${m.side_a} ${next.a} – ${next.b} ${m.side_b}`); }
    catch (e) { if (mine === seq.current) setNote(errMsg(e)); }
    finally { pending.current--; }
  };
  const step = (k: 'a' | 'b', d: number) => {
    const n = Math.max(0, Math.min(999, score[k] + d));
    if (n === score[k]) return;
    const next = { ...score, [k]: n }; setScore(next); save(next);
  };
  const btn = (k: 'a' | 'b', d: number) => (
    <Pressable onPress={() => step(k, d)} disabled={d < 0 && score[k] <= 0} hitSlop={4} accessibilityRole="button"
      accessibilityLabel={`${k === 'a' ? m.side_a : m.side_b} ${d < 0 ? 'minus' : 'plus'} one`}
      style={({ pressed }) => ({ width: 42, height: 42, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.bg2 : colors.card,
        alignItems: 'center', justifyContent: 'center', opacity: d < 0 && score[k] <= 0 ? 0.35 : 1 })}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{d < 0 ? '−' : '+'}</Text>
    </Pressable>
  );
  return (
    <View style={{ marginTop: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line }}>
      <T style={{ fontWeight: '800', marginBottom: 6 }}>Score</T>
      {(['a', 'b'] as const).map((k) => (
        <Row key={k} style={{ paddingVertical: 4 }}>
          <Text style={{ flex: 1, color: k === 'a' ? c.a : c.b, fontWeight: '700' }} numberOfLines={1}>{k === 'a' ? m.side_a : m.side_b}</Text>
          {btn(k, -1)}
          <Text accessibilityLiveRegion="polite" style={{ minWidth: 48, textAlign: 'center', color: colors.text, fontSize: 22, fontWeight: '800' }}>{score[k]}</Text>
          {btn(k, 1)}
        </Row>
      ))}
      <Dim style={{ fontSize: 12, marginTop: 4 }}>{note}</Dim>
    </View>
  );
}

function SettleSheet({ m, onClose, onDone }: { m: Match; onClose: () => void; onDone: () => void }) {
  const [result, setResult] = useState<Result | null>(null);
  const [ticked, setTicked] = useState(false);
  const start = (k: 'a' | 'b') => String(m.score_a != null || m.score_b != null ? Number((k === 'a' ? m.score_a : m.score_b) ?? 0) : 0);
  const [fa, setFa] = useState(start('a'));
  const [fb, setFb] = useState(start('b'));
  const needScore = !!result && result !== 'cancel';
  const scoresOk = !needScore || (fa !== '' && fb !== '');
  const label: Record<Result, string> = { a: `${m.side_a} won`, b: `${m.side_b} won`, draw: 'it was a draw', cancel: 'the match is cancelled' };
  const pq = useQuery({
    queryKey: ['settle-preview', m.id, result, needScore ? fa : '', needScore ? fb : ''], enabled: !!result && scoresOk, placeholderData: (prev) => prev,
    queryFn: () => api.get<Preview>(`/matches/${m.id}/settle-preview?result=${result}${needScore ? `&score_a=${fa}&score_b=${fb}` : ''}`),
  });
  const settle = useMutation({
    mutationFn: () => api.post<Match>(`/matches/${m.id}/settle`, { result, confirm: true, ...(needScore ? { score_a: Number(fa), score_b: Number(fb) } : {}) }),
    onSuccess: () => { onDone(); showAlert('Result saved', 'Winners are paid and every player is told.'); },
    onError: (e) => showAlert('Not saved', errMsg(e)),
  });
  const pick = (k: Result) => { setResult(k); setTicked(false); };
  const p = pq.data;

  const lines: string[] = [];
  if (p && result) {
    if (result === 'draw' || result === 'cancel') lines.push(p.refund_players ? `↩️ ${d(p.refunded)} returned to ${plural(p.refund_players, 'player')}.` : 'No matched predictions: nothing to return.');
    else {
      const who = result === 'a' ? m.side_a : m.side_b;
      lines.push(p.winners ? `🏆 ${who}: ${plural(p.winners, 'prediction')} by ${plural(p.winner_players, 'player')} win${p.winners === 1 ? 's' : ''}. ${d(p.paid_out)} paid out${p.fees > 0 ? ` (after ${d(p.fees)} in fees)` : ''}.` : `🏆 ${who}: nobody predicted this side, so no one is paid.`);
      lines.push(p.losers ? `❌ ${plural(p.losers, 'prediction')} by ${plural(p.loser_players, 'player')} lose${p.losers === 1 ? 's' : ''} ${d(p.lost)}.` : '❌ No one loses diamonds.');
    }
    if (p.unmatched_returned > 0) lines.push(`↩️ ${d(p.unmatched_returned)} that were never matched go back to the players first.`);
    lines.push('🔔 Every player is told the result.');
  }
  const ready = !!result && !!p && scoresOk && ticked && !settle.isPending;
  const onScore = (set: (v: string) => void) => (v: string) => { set(v.replace(/[^0-9]/g, '').slice(0, 3)); setTicked(false); };
  const scoreText = needScore && scoresOk ? ` (${m.side_a} ${fa} – ${fb} ${m.side_b})` : '';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '90%', backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.line }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 34 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }} />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Set the winner</Text>
            <Dim style={{ marginTop: 4 }} numberOfLines={2}>{m.title}</Dim>
            <Dim style={{ marginTop: 6, fontSize: 12.5 }}>This closes predictions (if still open), returns unmatched diamonds, pays the winners and tells every player the result. It cannot be undone.</Dim>

            <T style={{ fontWeight: '800', marginTop: 16, marginBottom: 8 }}>Who won?</T>
            <Row style={{ flexWrap: 'wrap', rowGap: 8 }}>
              <Chip label={`${m.side_a} wins`} active={result === 'a'} onPress={() => pick('a')} />
              <Chip label={`${m.side_b} wins`} active={result === 'b'} onPress={() => pick('b')} />
              <Chip label="Draw" active={result === 'draw'} onPress={() => pick('draw')} />
              <Chip label="Cancelled" active={result === 'cancel'} onPress={() => pick('cancel')} />
            </Row>

            {needScore ? (
              <>
                <T style={{ fontWeight: '800', marginTop: 16, marginBottom: 8 }}>Final score</T>
                <Row style={{ gap: 10 }}>
                  {([['a', fa, setFa], ['b', fb, setFb]] as const).map(([k, v, set]) => (
                    <View key={k} style={{ flex: 1 }}>
                      <Dim style={{ fontSize: 12, marginBottom: 4 }} numberOfLines={1}>{k === 'a' ? m.side_a : m.side_b}</Dim>
                      <TextInput value={v} onChangeText={onScore(set)} keyboardType="number-pad" maxLength={3} placeholder="0" placeholderTextColor={colors.dim}
                        accessibilityLabel={`Final score ${k === 'a' ? m.side_a : m.side_b}`}
                        style={{ backgroundColor: colors.bg2, borderWidth: 1.5, borderColor: v === '' ? colors.danger : colors.line, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 20, fontWeight: '800' }} />
                    </View>
                  ))}
                </Row>
                {!scoresOk ? <Dim style={{ color: colors.danger, marginTop: 6 }}>Enter the final score.</Dim> : null}
              </>
            ) : null}

            {p?.score_warning && p.score_warning_text && result && scoresOk ? (
              <View style={{ marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.warning + '1A', borderWidth: 1, borderColor: colors.warning }}>
                <T style={{ fontSize: 13 }}>⚠️ {p.score_warning_text}</T>
              </View>
            ) : null}

            {result && scoresOk ? (
              <View style={{ marginTop: 14 }}>
                <T style={{ fontWeight: '800', marginBottom: 6 }}>What happens when you confirm</T>
                {pq.isFetching && !p ? <ActivityIndicator color={colors.primarySoft} style={{ alignSelf: 'flex-start' }} />
                  : pq.error ? <Dim style={{ color: colors.danger }}>{errMsg(pq.error)}</Dim>
                  : lines.map((t) => <T key={t} style={{ fontSize: 13.5, marginTop: 4 }}>{t}</T>)}
              </View>
            ) : null}

            {result && p && scoresOk ? (
              <Pressable onPress={() => setTicked(!ticked)} accessibilityRole="checkbox" accessibilityState={{ checked: ticked }}
                accessibilityLabel="Confirm the result" hitSlop={6} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 }}>
                <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: ticked ? colors.danger : colors.line, backgroundColor: ticked ? colors.danger : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
                  {ticked ? <CheckIcon size={14} /> : null}
                </View>
                <T style={{ flex: 1, fontSize: 13.5 }}>I confirm {label[result]}{scoreText} in "{m.title}". This pays out now and cannot be undone.</T>
              </Pressable>
            ) : null}

            <Button title="Pay out and finish match" kind="danger" style={{ marginTop: 18 }} disabled={!ready} loading={settle.isPending} onPress={() => settle.mutate()} />
            <Button title="Cancel" kind="ghost" style={{ marginTop: 10 }} onPress={onClose} disabled={settle.isPending} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
