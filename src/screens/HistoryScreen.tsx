import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Text, View } from 'react-native';
import { Card, Chip, Dim, EmptyState, ErrorBox, Loading, Row, Screen, T, c, pts, when, H1 } from '../ui';
import { HistoryIcon } from '../icons';
import { colors } from '../theme';
import { useClubContext } from '../club';
import type { Prediction } from '../types';

/** plain words instead of the raw status */
const LABEL: Record<string, [string, string]> = { confirmed: ['Waiting for result', colors.primary], won: ['Won', colors.success], lost: ['Lost', colors.danger], refunded: ['Returned', colors.dim] };
const StatusPill = ({ s }: { s: string }) => {
  const [text, col] = LABEL[s] ?? [s, colors.dim];
  return <View style={{ borderWidth: 1, borderColor: col + '66', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ color: col, fontWeight: '800', fontSize: 11.5 }}>{text}</Text></View>;
};
const returned = (b: Prediction) => Number(b.matched_amount) > 0 ? Number(b.reward || 0) + Number(b.unmatched_refund || 0) : Number(b.original_amount ?? b.amount);

const FILTERS: [string, string][] = [['all', 'All'], ['confirmed', 'Active'], ['won', 'Won'], ['lost', 'Lost'], ['refunded', 'Returned']];

export default function HistoryScreen({ navigation }: any) {
  const [f, setF] = useState('all');
  const ctx = useClubContext();
  const q = useQuery({
    queryKey: ['predictions', f],
    queryFn: () => api.get<{ data: Prediction[]; totals: { used: number; won: number } }>('/predictions' + (f === 'all' ? '' : `?status=${f}`)),
  });
  const rows = ctx.inClub(q.data?.data ?? []);
  return (
    // a bottom-menu tab: brand header, no back arrow
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <H1>Prediction history</H1>
      {q.data ? (
        <Row style={{ gap: 10, marginBottom: 12 }}>
          <Card style={{ flex: 1, marginBottom: 0 }}><Dim>Diamonds used (settled)</Dim><T style={{ fontWeight: '800', fontSize: 18 }}>{pts(q.data.totals.used)}</T></Card>
          <Card style={{ flex: 1, marginBottom: 0 }}><Dim>Diamonds won</Dim><T style={{ fontWeight: '800', fontSize: 18, color: c.good }}>{pts(q.data.totals.won)}</T></Card>
        </Row>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}>
        {FILTERS.map(([x, label]) => <Chip key={x} label={label} active={f === x} onPress={() => setF(x)} />)}
      </ScrollView>
      {ctx.multi && ctx.active ? <Dim style={{ marginBottom: 10 }}>Showing {ctx.active.name}. Switch club from the top bar.</Dim> : null}
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        : rows.length === 0 ? (
          <EmptyState icon={<HistoryIcon size={26} />} title="No predictions yet" text={f === 'all' ? 'Your predictions show up here. Pick a match to start.' : 'Nothing here yet.'}
            actionLabel={f === 'all' ? 'See matches' : undefined} onAction={f === 'all' ? () => navigation.navigate('Matches') : undefined} />
        ) : rows.map((b) => (
          <Card key={b.id} onPress={() => navigation.navigate('Prediction', { id: b.match_id })}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}><T style={{ fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>{b.match}</T><StatusPill s={b.status} /></Row>
            <T style={{ fontWeight: '700', fontSize: 14 }}>{b.side_name ? `Your pick: ${b.side_name} · ` : ''}{pts(b.original_amount ?? b.amount)} 💎</T>
            {b.status === 'refunded' ? <Dim>{pts(returned(b))} 💎 returned to you</Dim>
              : b.status === 'confirmed' ? <Dim>{Number(b.matched_amount) >= Number(b.amount) ? 'Fully matched' : `Matched ${pts(b.matched_amount)} of ${pts(b.amount)}`}</Dim>
              : b.status === 'won' ? <T style={{ color: c.good, fontWeight: '700', fontSize: 13 }}>Won +{pts(b.reward)} 💎</T>
              : b.status === 'lost' ? <Dim>Lost · {pts(b.matched_amount)} 💎 used</Dim> : null}
            <Dim>{when(b.created_at)}</Dim>
          </Card>
        ))}
    </Screen>
  );
}
