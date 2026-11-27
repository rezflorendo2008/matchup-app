import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { MatchRow, OpenMatch } from './MatchRow';
import { Card, ClubAvatar, ClubVerificationBadge, Dim, Row, T, c, when } from '../ui';
import { ChevronDownIcon, ChevronRightIcon } from '../icons';
import type { Match } from '../types';

const ORDER: Record<string, number> = { closed: 0, open: 1, paused: 2, upcoming: 3, settled: 4 };   // live first, then today, upcoming, finished

interface Group { key: string; title: string; category: string; club: string; logo: string | null; verified: boolean; matches: Match[]; rank: number; start: number }

/** One group per event; every match of the event goes inside it. */
export function groupByEvent(list: Match[]): Group[] {
  const map = new Map<string, Group>();
  for (const m of list) {
    const key = m.event_id ? `e${m.event_id}` : `none-${m.club_id}`;
    let g = map.get(key);
    if (!g) {
      g = { key, title: m.event ?? 'Other matches', category: `${m.category_icon ? m.category_icon + ' ' : ''}${m.category ?? ''}`.trim(),
        club: m.club, logo: m.club_logo, verified: m.club_verified, matches: [], rank: 9, start: m.event_starts_at ? new Date(m.event_starts_at).getTime() : 0 };
      map.set(key, g);
    }
    g.matches.push(m);
  }
  const groups = [...map.values()];
  for (const g of groups) {
    g.matches.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
    g.rank = Math.min(...g.matches.map((m) => ORDER[m.status] ?? 9));
  }
  return groups.sort((a, b) => a.rank - b.rank || b.start - a.start);
}

/** Event name, "by club" with its icon and verified tick, then all the event's matches in the same card. */
export function EventCard({ title, category, club, logo, verified, start, matches, onOpen, collapsible = true }: {
  title: string; category: string; club: string; logo: string | null; verified: boolean; start?: number; matches: Match[]; onOpen: OpenMatch; collapsible?: boolean;
}) {
  const [shut, setShut] = useState(false);
  return (
    <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 18 }}>
      <Pressable onPress={collapsible ? () => setShut(!shut) : undefined} style={{ padding: 11, backgroundColor: c.card2 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '800', fontSize: 15 }}>{title}</T>
            <Row style={{ marginTop: 4 }}>
              <Dim style={{ fontSize: 12 }}>by </Dim>
              <ClubAvatar name={club} logo={logo} size={15} />
              <T style={{ fontWeight: '600', flexShrink: 1, fontSize: 13 }} numberOfLines={1}>{club}</T>
              {verified ? <ClubVerificationBadge size={14} /> : null}
            </Row>
            <Dim style={{ marginTop: 3, fontSize: 12 }}>{category ? `${category} · ` : ''}{matches.length} match{matches.length === 1 ? '' : 'es'}{start ? ` · ${when(new Date(start).toISOString())}` : ''}</Dim>
          </View>
          {collapsible ? (shut ? <ChevronRightIcon size={20} /> : <ChevronDownIcon size={20} />) : null}
        </Row>
      </Pressable>
      {shut ? null : <View style={{ paddingHorizontal: 11 }}>{matches.map((m) => <MatchRow key={m.id} m={m} onOpen={onOpen} />)}</View>}
    </Card>
  );
}

export function EventGroups({ matches, onOpen }: { matches: Match[]; onOpen: OpenMatch }) {
  const groups = useMemo(() => groupByEvent(matches), [matches]);
  return (
    <>
      {groups.map((g) => <EventCard key={g.key} title={g.title} category={g.category} club={g.club} logo={g.logo} verified={g.verified} start={g.start} matches={g.matches} onOpen={onOpen} />)}
    </>
  );
}
