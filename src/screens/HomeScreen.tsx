import React, { useState } from 'react';
import { Linking, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { POLL_MS } from '../config';
import { useAuth } from '../store';
import { Badge, Button, Card, CardSkeleton, Dim, EmptyState, ErrorBox, Field, Row, Screen, SectionHeader, T, c, pts } from '../ui';
import { LiveMatchCard, UpcomingMatchCard } from '../components/MatchCards';
import { EventListCard } from '../components/EventListCard';
import { PromoBanner, SponsoredBanner } from '../components/Banners';
import { ArrowDownIcon, ArrowUpIcon, HistoryIcon } from '../icons';
import { colors } from '../theme';
import type { Prediction, Home, Match, Promo } from '../types';
import { showAlert } from '../dialog';

/** Shown instead of the whole home feed until the player belongs to a club. */
function JoinFirstClub({ name, onBrowse }: { name: string; onBrowse: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [ref, setRef] = useState('');
  const join = useMutation({
    mutationFn: (v: string) => api.post('/clubs/join', { club_id: v, ref: ref.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['home'] }); qc.invalidateQueries({ queryKey: ['clubs'] }); showAlert('Request sent', 'The club owner will verify you soon.'); setCode(''); },
    onError: (e) => showAlert('Could not join', errMsg(e)),
  });
  const first = (name || '').trim().split(/\s+/)[0] || 'there';
  const steps = ['Ask your club owner for the club ID', 'Enter it below and send the request', 'Once approved, matches appear here'];
  return (
    <View style={{ paddingTop: 8 }}>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 }}>Hi {first}</Text>
      <Text style={{ color: colors.dim, fontSize: 15, marginTop: 4 }}>Join a club to start predicting.</Text>
      <Card style={{ marginTop: 18 }}>
        {steps.map((s, i) => (
          <Row key={s} style={{ marginBottom: i < steps.length - 1 ? 10 : 14, alignItems: 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
            </View>
            <T style={{ flex: 1, fontSize: 15 }}>{s}</T>
          </Row>
        ))}
        <Field label="Club ID" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. AB12CD" />
        <Field label="Referral code (optional)" value={ref} onChangeText={(v) => setRef(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} placeholder="From a friend" />
        <Button title="Request to join" onPress={() => join.mutate(code.trim())} loading={join.isPending} disabled={code.trim().length < 3} />
      </Card>
      <Button title="Browse clubs" kind="ghost" onPress={onBrowse} style={{ marginTop: 12 }} />
      <Dim style={{ marginTop: 16, textAlign: 'center' }}>Diamonds are virtual and have no cash value.</Dim>
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const user = useAuth((s) => s.user);
  const home = useQuery({ queryKey: ['home'], queryFn: () => api.get<Home>('/home'), refetchInterval: POLL_MS });
  const h = home.data;
  const hasClubs = h ? h.has_clubs : false;
  // Matches and results are only fetched once we know the player is in a club.
  const matches = useQuery({ queryKey: ['matches', 'all'], queryFn: () => api.get<Match[]>('/matches'), refetchInterval: POLL_MS, enabled: hasClubs });
  const results = useQuery({ queryKey: ['predictions', 'recent'], queryFn: () => api.get<{ data: Prediction[] }>('/predictions'), refetchInterval: POLL_MS, enabled: hasClubs });

  const tap = (p: Promo) => {
    api.post(`/banners/${p.id}/click`).catch(() => {});
    if (p.link_type === 'url' && p.link_value?.startsWith('https://')) Linking.openURL(p.link_value).catch(() => {});
    else if (p.link_type === 'match') navigation.navigate('Matches');
    else if (p.link_type === 'club') navigation.navigate('Clubs');
  };
  const openMatch = (m: Match, side?: 'a' | 'b') => navigation.navigate('Prediction', { id: m.id, side });
  const refresh = () => { home.refetch(); if (hasClubs) { matches.refetch(); results.refetch(); } };

  if (home.isLoading) return <Screen><CardSkeleton rows={3} kind="match" /></Screen>;
  if (home.error && !h) return <Screen onRefresh={refresh}><ErrorBox error={home.error} onRetry={refresh} /></Screen>;
  if (h && !h.has_clubs) {
    return (
      <Screen onRefresh={refresh} refreshing={home.isRefetching}>
        <JoinFirstClub name={user?.name ?? ''} onBrowse={() => navigation.navigate('Clubs')} />
      </Screen>
    );
  }

  const all = matches.data ?? [];
  const today = all.filter((m) => m.status === 'open' || m.status === 'paused');   // predictions open (or paused for a moment)
  const live = all.filter((m) => m.status === 'closed');                            // predictions closed, match being played
  const upcoming = all.filter((m) => m.status === 'upcoming');
  const recent = (results.data?.data ?? []).filter((b) => ['won', 'lost', 'refunded'].includes(b.status)).slice(0, 3);
  const cardW = width - 32;
  const now = Date.now();
  const upcomingEvents = (h?.events ?? []).slice(0, 3);   // the server sends only events that are on and have announced, open or live matches
  const first = (user?.name ?? '').trim().split(/\s+/)[0] || 'there';

  return (
    <Screen onRefresh={refresh} refreshing={home.isRefetching || matches.isRefetching}>
      <Row style={{ justifyContent: 'space-between', paddingTop: 4 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 }}>Hi {first}</Text>
        {live.length > 0 ? <Badge text={`${live.length} live`} /> : today.length > 0 ? <Badge text={`${today.length} open`} /> : null}
      </Row>

      {!user?.can_predict ? (
        <Card onPress={() => navigation.navigate('Verify')} style={{ marginTop: 12, borderColor: colors.warning }}>
          <T style={{ fontWeight: '800' }}>Verify your account to predict</T>
          <Dim style={{ marginTop: 2 }}>Confirm your email and ID. Takes about 2 minutes.</Dim>
        </Card>
      ) : null}

      {/* live matches always come first */}
      {live.length > 0 ? (
        <>
          <SectionHeader title="Live now" action={live.length > 3 ? 'See all' : undefined} onAction={() => navigation.navigate('Matches')} />
          {live.slice(0, 3).map((m) => <LiveMatchCard key={m.id} m={m} onOpen={openMatch} />)}
        </>
      ) : null}

      <SectionHeader title="Today's matches" action={today.length > 4 ? 'See all' : undefined} onAction={() => navigation.navigate('Matches')} />
      {matches.isLoading ? <CardSkeleton rows={2} kind="match" />
        : today.length === 0 ? <EmptyState title="No matches open right now" text="Matches open for predictions show up here." />
        : today.slice(0, 4).map((m) => <LiveMatchCard key={m.id} m={m} onOpen={openMatch} />)}

      {upcoming.length > 0 ? (
        <>
          <SectionHeader title="Coming up" action="All matches" onAction={() => navigation.navigate('Matches')} />
          {upcoming.slice(0, 3).map((m) => <UpcomingMatchCard key={m.id} m={m} onOpen={openMatch} />)}
        </>
      ) : null}

      {recent.length > 0 ? (
        <>
          <SectionHeader title="My latest results" action="History" onAction={() => navigation.navigate('History')} />
          {recent.map((b) => {
            const won = b.status === 'won', lost = b.status === 'lost';
            return (
              <Card key={b.id} onPress={() => navigation.navigate('Prediction', { id: b.match_id })} style={{ paddingVertical: 12 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T style={{ fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>{b.match}</T>
                  <Row>
                    {won ? <ArrowUpIcon /> : lost ? <ArrowDownIcon /> : <HistoryIcon size={16} />}
                    <T style={{ marginLeft: 6, fontWeight: '800', color: won ? c.good : c.dim }}>
                      {won ? `+${pts(b.reward)} 💎` : lost ? `−${pts(b.matched_amount)} 💎` : `${pts(b.reward)} 💎 back`}
                    </T>
                  </Row>
                </Row>
              </Card>
            );
          })}
        </>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <>
          <SectionHeader title="Events" />
          {upcomingEvents.map((e) => <EventListCard key={e.id} e={e} onPress={() => navigation.navigate('Event', { event: e })} />)}
        </>
      ) : null}

      {h && h.promos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardW + 10} decelerationRate="fast" style={{ marginTop: 16 }}>
          {h.promos.map((p) => <PromoBanner key={p.id} p={p} width={cardW} onPress={() => tap(p)} />)}
        </ScrollView>
      ) : null}
      {h && h.ads.length > 0 ? <View style={{ marginTop: 16 }}>{h.ads.map((a) => <SponsoredBanner key={a.id} ad={a} onPress={() => tap(a)} />)}</View> : null}
    </Screen>
  );
}
