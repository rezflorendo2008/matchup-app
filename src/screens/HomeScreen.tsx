import React from 'react';
import { Alert, Linking, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { POLL_MS } from '../config';
import { useAuth } from '../store';
import { Badge, Card, CardSkeleton, Dim, EmptyState, ErrorBox, Row, Screen, SectionHeader, T, c, pts } from '../ui';
import { LiveMatchCard, UpcomingMatchCard } from '../components/MatchCards';
import { FeaturedClubCard } from '../components/FeaturedClubCard';
import { EventListCard } from '../components/EventListCard';
import { PromoBanner, SponsoredBanner, WelcomeBanner } from '../components/Banners';
import { ArrowDownIcon, ArrowUpIcon, HistoryIcon, UsersIcon } from '../icons';
import { colors } from '../theme';
import type { Prediction, Home, Match, Promo } from '../types';

export default function HomeScreen({ navigation }: any) {
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const user = useAuth((s) => s.user);
  const home = useQuery({ queryKey: ['home'], queryFn: () => api.get<Home>('/home'), refetchInterval: POLL_MS });
  const matches = useQuery({ queryKey: ['matches', 'all'], queryFn: () => api.get<Match[]>('/matches'), refetchInterval: POLL_MS });
  const results = useQuery({ queryKey: ['predictions', 'recent'], queryFn: () => api.get<{ data: Prediction[] }>('/predictions'), refetchInterval: POLL_MS });
  const recent = (results.data?.data ?? []).filter((b) => ['won', 'lost', 'refunded'].includes(b.status)).slice(0, 5);

  const join = useMutation({
    mutationFn: (code: string) => api.post('/clubs/join', { club_id: code }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['home'] }); qc.invalidateQueries({ queryKey: ['clubs'] }); Alert.alert('Request sent', 'The club owner will verify you soon.'); },
    onError: (e) => Alert.alert('Could not join', errMsg(e)),
  });

  const tap = (p: Promo) => {
    api.post(`/banners/${p.id}/click`).catch(() => {});
    if (p.link_type === 'url' && p.link_value?.startsWith('https://')) Linking.openURL(p.link_value).catch(() => {});
    else if (p.link_type === 'match') navigation.navigate('Matches');
    else if (p.link_type === 'club') navigation.navigate('Clubs');
  };
  const openMatch = (m: Match, side?: 'a' | 'b') => navigation.navigate('Prediction', { id: m.id, side });

  const refresh = () => { home.refetch(); matches.refetch(); results.refetch(); };
  const all = matches.data ?? [];
  const live = all.filter((m) => m.status === 'open' || m.status === 'paused');
  const upcoming = all.filter((m) => m.status === 'upcoming');
  const h = home.data;
  const cardW = width - 32;
  const now = Date.now();
  const events = h?.events ?? [];
  const upcomingEvents = events.filter((e) => new Date(e.starts_at).getTime() >= now - 6 * 3600e3);
  const pastEvents = events.filter((e) => !upcomingEvents.includes(e));

  return (
    <Screen onRefresh={refresh} refreshing={home.isRefetching || matches.isRefetching}>
      <WelcomeBanner name={user?.name ?? ''} hasClubs={h ? h.has_clubs : true} liveCount={live.length}
        onExplore={() => navigation.navigate(h && !h.has_clubs ? 'Clubs' : 'Matches')} />

      {home.error ? <View style={{ marginTop: 12 }}><ErrorBox error={home.error} onRetry={refresh} /></View> : null}

      {h && h.promos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardW + 10} decelerationRate="fast" style={{ marginTop: 14 }}>
          {h.promos.map((p) => <PromoBanner key={p.id} p={p} width={cardW} onPress={() => tap(p)} />)}
        </ScrollView>
      ) : null}

      {recent.length > 0 ? (
        <>
          <SectionHeader title="My results" action="History" onAction={() => navigation.navigate('History')} />
          {recent.map((b) => {
            const won = b.status === 'won', lost = b.status === 'lost';
            return (
              <Card key={b.id} onPress={() => navigation.navigate('Prediction', { id: b.match_id })}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T style={{ fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>{b.match}</T>
                  <Badge text={b.status} />
                </Row>
                <Row style={{ marginTop: 6 }}>
                  {won ? <ArrowUpIcon /> : lost ? <ArrowDownIcon /> : <HistoryIcon size={16} />}
                  <T style={{ marginLeft: 6, fontWeight: '700', color: won ? c.good : lost ? c.bad : c.dim }}>
                    {won ? `+${pts(b.reward)} 💎 won` : lost ? `−${pts(b.matched_amount)} 💎` : `${pts(b.reward)} 💎 returned`}
                  </T>
                </Row>
              </Card>
            );
          })}
        </>
      ) : null}

      <SectionHeader title="Live matches" action={live.length > 0 ? 'See all' : undefined} onAction={() => navigation.navigate('Matches')} />
      {matches.isLoading ? <CardSkeleton rows={2} kind="match" />
        : h && !h.has_clubs ? (
          <EmptyState icon={<UsersIcon size={26} color={colors.dim} />} title="Join a club to start predicting" text="Pick a featured club below or enter a club ID from your club owner."
            actionLabel="Find a club" onAction={() => navigation.navigate('Clubs')} />
        ) : live.length === 0 ? <EmptyState title="No live matches" text="Matches open for predictions will show up here." />
        : live.slice(0, 4).map((m) => <LiveMatchCard key={m.id} m={m} onOpen={openMatch} />)}

      {upcoming.length > 0 ? (
        <>
          <SectionHeader title="Upcoming matches" action={upcoming.length > 4 ? 'See all' : undefined} onAction={() => navigation.navigate('Matches')} />
          {upcoming.slice(0, 4).map((m) => <UpcomingMatchCard key={m.id} m={m} onOpen={openMatch} />)}
        </>
      ) : null}

      {h && h.featured_clubs.length > 0 ? (
        <>
          <SectionHeader title="Featured clubs" action="Clubs" onAction={() => navigation.navigate('Clubs')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={256} contentContainerStyle={{ paddingRight: 8 }}>
            {h.featured_clubs.map((f) => (
              <FeaturedClubCard key={f.id} club={f} onOpen={() => navigation.navigate('Club', { id: f.id })} onJoin={() => join.mutate(f.club_code)} joining={join.isPending && join.variables === f.club_code} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionHeader title="Events" />
      {home.isLoading && !h ? <CardSkeleton rows={2} />
        : upcomingEvents.length === 0 && pastEvents.length === 0 ? <EmptyState title="No events yet" text="Events created by your clubs will appear here." />
        : (
          <>
            {upcomingEvents.length > 0 ? <Text style={{ color: colors.dim, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 }}>UPCOMING</Text> : null}
            {upcomingEvents.map((e) => <EventListCard key={e.id} e={e} onPress={() => navigation.navigate('Event', { event: e })} />)}
            {pastEvents.length > 0 ? <Text style={{ color: colors.dim, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginVertical: 8 }}>COMPLETED</Text> : null}
            {pastEvents.map((e) => <EventListCard key={e.id} e={e} past onPress={() => navigation.navigate('Event', { event: e })} />)}
          </>
        )}

      {h && h.ads.length > 0 ? (
        <View style={{ marginTop: 16 }}>{h.ads.map((a) => <SponsoredBanner key={a.id} ad={a} onPress={() => tap(a)} />)}</View>
      ) : null}
    </Screen>
  );
}
