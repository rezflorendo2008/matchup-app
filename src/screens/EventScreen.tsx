import React from 'react';
import { Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { POLL_MS } from '../config';
import { EventCard } from '../components/EventGroups';
import { Button, Dim, ErrorBox, H1, H2, Loading, Screen, T, when } from '../ui';
import type { EventItem, Match } from '../types';

export default function EventScreen({ route, navigation }: any) {
  const e: EventItem = route.params.event;
  const q = useQuery({ queryKey: ['matches', 'event', e.id], refetchInterval: POLL_MS, queryFn: () => api.get<Match[]>(`/matches?event_id=${e.id}`) });
  const order: Record<string, number> = { open: 0, paused: 1, upcoming: 2, closed: 3, settled: 4 };
  const list = [...(q.data ?? [])].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Button title="‹ Back" kind="ghost" onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, marginBottom: 10 }} />
      {e.image ? <Image source={{ uri: e.image }} style={{ width: '100%', height: 190, borderRadius: 14, marginBottom: 14 }} resizeMode="cover" /> : null}
      <Dim>{e.category_icon ? `${e.category_icon} ` : ''}{e.category ?? 'Event'}</Dim>
      <H1>{e.title}</H1>
      <T>{when(e.starts_at)}{e.ends_at ? ` – ${when(e.ends_at)}` : ''}</T>
      {e.location ? <Dim style={{ marginTop: 4 }}>{e.location}</Dim> : null}
      {e.description ? <T style={{ marginTop: 16, lineHeight: 22 }}>{e.description}</T> : null}

      <H2>Matches in this event</H2>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        : list.length === 0 ? <Dim>No matches have been added to this event yet.</Dim>
        : <EventCard title={e.title} category={e.category ?? ''} club={list[0].club} logo={list[0].club_logo} verified={list[0].club_verified} matches={list}
            collapsible={false} onOpen={(m, side) => navigation.navigate('Prediction', { id: m.id, side })} />}
    </Screen>
  );
}
