import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { POLL_MS } from '../config';
import { EventGroups } from '../components/EventGroups';
import { CardSkeleton, Chip, EmptyState, ErrorBox, H1, Screen } from '../ui';
import type { Category, Match } from '../types';

export default function MatchesScreen({ navigation }: any) {
  const [cat, setCat] = useState<number | null>(null);
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') });
  const q = useQuery({
    queryKey: ['matches', cat ?? 'all'], refetchInterval: POLL_MS,
    queryFn: () => api.get<Match[]>('/matches' + (cat ? `?category_id=${cat}` : '')),
  });

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <H1>Matches</H1>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, flexGrow: 0 }}>
        <Chip label="All" active={cat === null} onPress={() => setCat(null)} />
        {(cats.data ?? []).map((x) => <Chip key={x.id} label={`${x.icon ?? ''} ${x.name}`.trim()} active={cat === x.id} onPress={() => setCat(x.id)} />)}
      </ScrollView>
      {q.isLoading ? <CardSkeleton rows={3} kind="match" /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        : (q.data?.length ?? 0) === 0 ? <EmptyState title="No matches yet" text="Join a club and wait for the owner to verify you, then matches show up here." actionLabel="Find a club" onAction={() => navigation.navigate('Clubs')} />
        : <EventGroups matches={q.data!} onOpen={(m, side) => navigation.navigate('Prediction', { id: m.id, side })} />}
    </Screen>
  );
}
