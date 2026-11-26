import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { Button, Card, Chip, Dim, Row, T, pts } from '../ui';
import { CheckIcon } from '../icons';
import { colors, radius } from '../theme';
import type { Match } from '../types';

type Result = 'a' | 'b' | 'draw' | 'cancel';
type Preview = {
  winners: number; winner_players: number; paid_out: number; fees: number; losers: number; loser_players: number; lost: number;
  unmatched_returned: number; refunded: number; refund_players: number; score_warning: boolean; score: { a: number; b: number } | null;
};

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const d = (n: number | string) => `${pts(n)} 💎`;

/** Club owner / match agent: close predictions and set the winner from the match page. Players never see this. */
export function ClubControls({ m, onDone }: { m: Match; onDone: () => void }) {
  const [settling, setSettling] = useState(false);
  const close = useMutation({
    mutationFn: () => api.post<Match>(`/matches/${m.id}/close`),
    onSuccess: () => { onDone(); Alert.alert('Predictions closed', 'Unmatched diamonds went back to the players. Set the winner when the match ends.'); },
    onError: (e) => Alert.alert('Could not close', errMsg(e)),
  });
  const askClose = () => Alert.alert('Close predictions?',
    `Players can no longer predict on "${m.title}". Diamonds that were never matched go back to the players. Set the winner when the match ends.`,
    [{ text: 'Keep open', style: 'cancel' }, { text: 'Close predictions', style: 'destructive', onPress: () => close.mutate() }]);

  return (
    <Card style={{ marginTop: 14, borderColor: colors.primary + '66' }}>
      <T style={{ fontWeight: '800' }}>🛠 Club controls</T>
      <Dim style={{ fontSize: 12, marginTop: 2 }}>Only you and your agents see this</Dim>
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

function SettleSheet({ m, onClose, onDone }: { m: Match; onClose: () => void; onDone: () => void }) {
  const [result, setResult] = useState<Result | null>(null);
  const [ticked, setTicked] = useState(false);
  const label: Record<Result, string> = { a: `${m.side_a} won`, b: `${m.side_b} won`, draw: 'it was a draw', cancel: 'the match is cancelled' };
  const pq = useQuery({
    queryKey: ['settle-preview', m.id, result], enabled: !!result,
    queryFn: () => api.get<Preview>(`/matches/${m.id}/settle-preview?result=${result}`),
  });
  const settle = useMutation({
    mutationFn: () => api.post<Match>(`/matches/${m.id}/settle`, { result, confirm: true }),
    onSuccess: () => { onDone(); Alert.alert('Result saved', 'Winners are paid and every player is told.'); },
    onError: (e) => Alert.alert('Not saved', errMsg(e)),
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
  const ready = !!result && !!p && ticked && !settle.isPending;

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

            {p?.score_warning && p.score && result ? (
              <View style={{ marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.warning + '1A', borderWidth: 1, borderColor: colors.warning }}>
                <T style={{ fontSize: 13 }}>⚠️ The score is {m.side_a} {p.score.a} – {p.score.b} {m.side_b}. You picked {result === 'a' ? m.side_a : m.side_b}, who is not ahead. Check before you confirm.</T>
              </View>
            ) : null}

            {result ? (
              <View style={{ marginTop: 14 }}>
                <T style={{ fontWeight: '800', marginBottom: 6 }}>What happens when you confirm</T>
                {pq.isFetching && !p ? <ActivityIndicator color={colors.primarySoft} style={{ alignSelf: 'flex-start' }} />
                  : pq.error ? <Dim style={{ color: colors.danger }}>{errMsg(pq.error)}</Dim>
                  : lines.map((t) => <T key={t} style={{ fontSize: 13.5, marginTop: 4 }}>{t}</T>)}
              </View>
            ) : null}

            {result && p ? (
              <Pressable onPress={() => setTicked(!ticked)} accessibilityRole="checkbox" accessibilityState={{ checked: ticked }}
                accessibilityLabel="Confirm the result" hitSlop={6} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 }}>
                <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: ticked ? colors.danger : colors.line, backgroundColor: ticked ? colors.danger : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
                  {ticked ? <CheckIcon size={14} /> : null}
                </View>
                <T style={{ flex: 1, fontSize: 13.5 }}>I confirm {label[result]} in "{m.title}". This pays out now and cannot be undone.</T>
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
