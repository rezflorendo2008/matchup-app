import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { POLL_MS } from '../config';
import { EventGroups } from '../components/EventGroups';
import { CardSkeleton, Chip, EmptyState, ErrorBox, H1, Screen } from '../ui';
import { colors, radius } from '../theme';
import type { Category, Match } from '../types';

/** Today = predictions open (or paused for a moment), Live = predictions closed while the match is played, Upcoming, Finished. */
type Tab = 'today' | 'live' | 'upcoming' | 'finished';
const TABS: { key: Tab; label: string; test: (m: Match) => boolean }[] = [
  { key: 'live', label: 'Live', test: (m) => m.status === 'closed' },
  { key: 'today', label: 'Today', test: (m) => m.status === 'open' || m.status === 'paused' },
  { key: 'upcoming', label: 'Upcoming', test: (m) => m.status === 'upcoming' },
  { key: 'finished', label: 'Finished', test: (m) => m.status === 'settled' },
];

/** Three big tabs with counts: the one decision a player makes on this screen. */
function Segmented({ value, counts, onChange }: { value: Tab; counts: Record<Tab, number>; onChange: (t: Tab) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 4, marginBottom: 12 }}>
      {TABS.map((t) => {
        const on = t.key === value;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: on ? colors.primary : 'transparent' }}>
            <Text style={{ color: on ? '#fff' : colors.dim, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{t.label}{counts[t.key] ? ` ${counts[t.key]}` : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MatchesScreen({ navigation }: any) {
  const [cat, setCat] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories'), refetchInterval: POLL_MS });
  const q = useQuery({
    queryKey: ['matches', cat ?? 'all'], refetchInterval: POLL_MS,
    queryFn: () => api.get<Match[]>('/matches' + (cat ? `?category_id=${cat}` : '')),
  });
  const all = q.data ?? [];
  const counts = { today: 0, live: 0, upcoming: 0, finished: 0 } as Record<Tab, number>;
  TABS.forEach((t) => { counts[t.key] = all.filter(t.test).length; });
  // Live is the default tab; when nothing is live, open the next tab that has matches.
  const active: Tab = tab ?? (counts.live ? 'live' : counts.today ? 'today' : counts.upcoming ? 'upcoming' : counts.finished ? 'finished' : 'live');
  // The server only lists categories with current matches; drop a picked one that no longer has any.
  useEffect(() => { if (cat !== null && cats.data && !cats.data.some((c) => c.id === cat)) setCat(null); }, [cats.data, cat]);
  const shown = all.filter(TABS.find((t) => t.key === active)!.test);
  const catList = cats.data ?? [];

  return (
    <Screen onRefresh={() => { q.refetch(); cats.refetch(); }} refreshing={q.isRefetching}>
      <H1>Matches</H1>
      <Segmented value={active} counts={counts} onChange={setTab} />
      {catList.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}>
          <Chip label="All sports" active={cat === null} onPress={() => setCat(null)} />
          {catList.map((x) => <Chip key={x.id} label={`${x.icon ?? ''} ${x.name}`.trim()} active={cat === x.id} onPress={() => setCat(x.id)} />)}
        </ScrollView>
      ) : null}
      {q.isLoading ? <CardSkeleton rows={3} kind="match" /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        : all.length === 0 ? <EmptyState title="No matches yet" text="Join a club and wait for the owner to verify you, then matches show up here." actionLabel="Find a club" onAction={() => navigation.navigate('Clubs')} />
        : shown.length === 0 ? <EmptyState title={({ today: 'No matches open today', live: 'Nothing live right now', upcoming: 'Nothing coming up', finished: 'No finished matches' } as Record<Tab, string>)[active]}
            text={active === 'live' && counts.today ? 'Check the Today tab for matches open for predictions.' : active === 'today' && counts.upcoming ? 'Check the Upcoming tab for what is next.' : 'New matches from your clubs appear here.'} />
        : <EventGroups matches={shown} onOpen={(m, side) => navigation.navigate('Prediction', { id: m.id, side })} />}
    </Screen>
  );
}
