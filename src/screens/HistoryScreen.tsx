import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Badge, Card, Chip, Dim, Empty, ErrorBox, Loading, Row, Screen, T, c, pts, when, H1 } from '../ui';
import type { Prediction } from '../types';

const FILTERS: [string, string][] = [['all', 'All'], ['confirmed', 'Active'], ['won', 'Won'], ['lost', 'Lost'], ['refunded', 'Returned']];

export default function HistoryScreen({ navigation }: any) {
  const [f, setF] = useState('all');
  const q = useQuery({
    queryKey: ['predictions', f],
    queryFn: () => api.get<{ data: Prediction[]; totals: { used: number; won: number } }>('/predictions' + (f === 'all' ? '' : `?status=${f}`)),
  });
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
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        : (q.data?.data.length ?? 0) === 0 ? <Empty text="No predictions yet." />
        : q.data!.data.map((b) => (
          <Card key={b.id} onPress={() => navigation.navigate('Prediction', { id: b.match_id })}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 4 }}><T style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>{b.match}</T><Badge text={b.status} /></Row>
            <Dim>Diamonds {pts(b.amount)} · matched {pts(b.matched_amount)}</Dim>
            {b.status === 'won' ? <T style={{ color: c.good, fontWeight: '700', fontSize: 13 }}>Won +{pts(b.reward)} 💎</T> : b.status === 'lost' ? <Dim>Lost · {pts(b.matched_amount)} 💎 used</Dim> : null}
            <Dim>{when(b.created_at)}</Dim>
          </Card>
        ))}
    </Screen>
  );
}
