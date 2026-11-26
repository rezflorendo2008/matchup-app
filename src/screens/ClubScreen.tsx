import React, { useState } from 'react';
import { Alert, Image, Pressable, Share, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { POLL_MS } from '../config';
import { EventGroups } from '../components/EventGroups';
import { Badge, Button, Card, CardSkeleton, Chip, ClubAvatar, ClubVerificationBadge, Dim, EmptyState, ErrorBox, Row, Screen, SectionHeader, T, c, pts, whenShort } from '../ui';
import { DiamondIcon, TrophyIcon } from '../icons';
import { colors, radius } from '../theme';
import type { ClubProfile } from '../types';

type Tab = 'matches' | 'board' | 'about';
type Period = 'week' | 'month' | 'all';
type Entry = { rank: number; name: string; mine: boolean; wins: number; losses: number; win_rate: number; net: number };
type Board = { period: Period; players: number; data: Entry[]; me: Entry | null };

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <View style={{ flex: 1, backgroundColor: colors.bg2, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.line }}>
    <T style={{ fontWeight: '800', fontSize: 20 }}>{value}</T>
    <Dim style={{ fontSize: 12, marginTop: 2 }}>{label}</Dim>
  </View>
);

function TabBar({ value, onChange, tabs }: { value: Tab; onChange: (t: Tab) => void; tabs: [Tab, string][] }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 4, marginTop: 12, marginBottom: 4 }}>
      {tabs.map(([k, label]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', backgroundColor: on ? colors.primary : 'transparent' }}>
            <Text style={{ color: on ? '#fff' : colors.dim, fontWeight: '700', fontSize: 14 }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const MEDAL = ['🥇', '🥈', '🥉'];
function Rank({ n }: { n: number }) {
  return <View style={{ width: 34, alignItems: 'center' }}>{n <= 3 ? <Text style={{ fontSize: 22 }}>{MEDAL[n - 1]}</Text> : <Text style={{ color: colors.dim, fontWeight: '800', fontSize: 15 }}>{n}</Text>}</View>;
}
function BoardRow({ e }: { e: Entry }) {
  const up = e.net > 0, down = e.net < 0;
  return (
    <Row style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: e.mine ? colors.primary + '1F' : 'transparent', borderRadius: radius.md }}>
      <Rank n={e.rank} />
      <View style={{ flex: 1, marginLeft: 6 }}>
        <T style={{ fontWeight: e.mine ? '800' : '700' }} numberOfLines={1}>{e.name}{e.mine ? ' (you)' : ''}</T>
        <Dim style={{ fontSize: 12 }}>{e.wins}W · {e.losses}L · {e.win_rate}% win rate</Dim>
      </View>
      <T style={{ fontWeight: '800', color: up ? c.good : down ? c.bad : c.dim }}>{up ? '+' : ''}{pts(e.net)} 💎</T>
    </Row>
  );
}

function Leaderboard({ clubId }: { clubId: number }) {
  const [period, setPeriod] = useState<Period>('week');
  const q = useQuery({ queryKey: ['leaderboard', clubId, period], queryFn: () => api.get<Board>(`/clubs/${clubId}/leaderboard?period=${period}`), refetchInterval: POLL_MS });
  const board = q.data;
  return (
    <View style={{ marginTop: 12 }}>
      <Row style={{ marginBottom: 6 }}>
        <Chip label="This week" active={period === 'week'} onPress={() => setPeriod('week')} />
        <Chip label="This month" active={period === 'month'} onPress={() => setPeriod('month')} />
        <Chip label="All time" active={period === 'all'} onPress={() => setPeriod('all')} />
      </Row>
      {q.isLoading ? <CardSkeleton rows={5} /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        : !board || board.data.length === 0 ? <EmptyState icon={<TrophyIcon size={26} />} title="No results yet" text="Leaders appear after matches are settled. Make a prediction to get on the board." />
        : (
          <>
            {board.me ? (
              <Card style={{ borderColor: colors.primary }}>
                <Dim>Your position</Dim>
                <BoardRow e={board.me} />
              </Card>
            ) : <Dim style={{ marginBottom: 8 }}>You have no settled predictions in this period yet.</Dim>}
            <Card style={{ paddingHorizontal: 4, paddingVertical: 6 }}>
              {board.data.map((e) => <BoardRow key={e.rank} e={e} />)}
            </Card>
            <Dim style={{ textAlign: 'center', fontSize: 12 }}>Ranked by diamonds won minus lost on settled predictions · {board.players} player{board.players === 1 ? '' : 's'}</Dim>
          </>
        )}
    </View>
  );
}

/** Club profile: matches, leaderboard and club info. Leaving the club lives here (About tab) and nowhere else. */
export default function ClubScreen({ route, navigation }: any) {
  const id: number = route.params.id;
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('matches');
  const q = useQuery({ queryKey: ['club', id], refetchInterval: POLL_MS, queryFn: () => api.get<ClubProfile>(`/clubs/${id}/profile`) });
  const refresh = () => ['club', 'clubs', 'matches', 'home', 'wallets', 'leaderboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const join = useMutation({
    mutationFn: (code: string) => api.post('/clubs/join', { club_id: code }),
    onSuccess: () => { refresh(); Alert.alert('Request sent', 'The club owner must verify you before you can make predictions.'); },
    onError: (e) => Alert.alert('Could not join', errMsg(e)),
  });
  const leave = useMutation({
    mutationFn: () => api.del(`/clubs/${id}/membership`),
    onSuccess: () => { refresh(); Alert.alert('Done', 'You have left the club.'); navigation.goBack(); },
    onError: (e) => Alert.alert('Could not leave', errMsg(e)),
  });

  const cl = q.data;
  const approved = cl?.membership === 'approved';
  const open = (m: { id: number }, side?: 'a' | 'b') => navigation.navigate('Prediction', { id: m.id, side });
  const askLeave = () => cl && Alert.alert(cl.membership === 'pending' ? 'Cancel your request?' : `Leave ${cl.name}?`,
    approved ? `Your ${pts(cl.balance)} diamonds stay in the club. You can't predict here while you're away.` : undefined,
    [{ text: 'Stay', style: 'cancel' }, { text: cl.membership === 'pending' ? 'Cancel request' : 'Leave club', style: 'destructive', onPress: () => leave.mutate() }]);

  const tabs: [Tab, string][] = approved ? [['matches', 'Matches'], ['board', 'Leaderboard'], ['about', 'About']] : [['about', 'About']];
  const active: Tab = approved ? tab : 'about';

  return (
    <Screen title="Club" onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <CardSkeleton rows={3} kind="club" /> : q.error || !cl ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          {cl.banner ? <Image source={{ uri: cl.banner }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, marginBottom: 10, backgroundColor: colors.card }} resizeMode="cover" accessibilityLabel={`${cl.name} banner`} /> : null}
          <Row>
            <ClubAvatar name={cl.name} logo={cl.logo} size={60} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Row><Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flexShrink: 1 }} numberOfLines={2}>{cl.name}</Text>{cl.status === 'active' ? <ClubVerificationBadge /> : null}</Row>
              <Dim>ID {cl.club_code} · {cl.club_pays ? 'Club multiplier' : 'Player vs player'}</Dim>
            </View>
          </Row>
          {cl.tagline ? <T style={{ marginTop: 10, lineHeight: 21 }}>{cl.tagline}</T> : null}
          {cl.status !== 'active' ? <Dim style={{ marginTop: 6 }}>Club {cl.status}</Dim> : null}

          {approved ? (
            <Row style={{ marginTop: 12, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 12, justifyContent: 'space-between' }}>
              <Row><DiamondIcon size={20} color={colors.primarySoft} /><Text style={{ color: colors.text, fontWeight: '800', fontSize: 20, marginLeft: 8 }}>{pts(cl.balance)}</Text><Dim style={{ marginLeft: 6 }}>diamonds here</Dim></Row>
              <Badge text="approved" />
            </Row>
          ) : !cl.membership ? (
            <Button title="Request to join" style={{ marginTop: 12 }} onPress={() => join.mutate(cl.club_code)} loading={join.isPending} />
          ) : (
            <Card style={{ marginTop: 12, borderColor: colors.amber + '66' }}>
              <Row style={{ justifyContent: 'space-between' }}><T style={{ fontWeight: '700' }}>Request sent</T><Badge text={cl.membership} /></Row>
              <Dim style={{ marginTop: 4 }}>Waiting for the club owner to verify you. Matches and the leaderboard unlock once you are approved.</Dim>
            </Card>
          )}

          {approved ? <TabBar value={active} onChange={setTab} tabs={tabs} /> : null}

          {active === 'matches' ? (
            <>
              {cl.my_current.length > 0 ? (
                <>
                  <SectionHeader title="My current predictions" />
                  {cl.my_current.map((p) => (
                    <Card key={p.id} onPress={() => open({ id: p.match_id })} style={{ paddingVertical: 12 }}>
                      <T style={{ fontWeight: '700' }} numberOfLines={1}>{p.match}</T>
                      <Dim>{p.side_name} · {pts(p.amount)} 💎 · matched {pts(p.matched_amount)} · {whenShort(p.created_at)}</Dim>
                    </Card>
                  ))}
                </>
              ) : null}
              <SectionHeader title="Open and upcoming" />
              {cl.current_matches.length === 0
                ? <EmptyState title="Nothing open right now" text="New events and matches from this club will appear here." />
                : <EventGroups matches={cl.current_matches} onOpen={open} />}
              {cl.past_matches.length > 0 ? (
                <>
                  <SectionHeader title="Ended in the last 7 days" />
                  <EventGroups matches={cl.past_matches} onOpen={open} />
                </>
              ) : null}
            </>
          ) : null}

          {active === 'board' ? <Leaderboard clubId={id} /> : null}

          {active === 'about' ? (
            <>
              <SectionHeader title="Club" />
              <Row style={{ gap: 10 }}>
                <Stat label="Members" value={cl.stats.members} />
                <Stat label="Matches" value={cl.stats.matches} />
                <Stat label="Predictions" value={cl.stats.club_predictions} />
              </Row>
              <Dim style={{ marginTop: 10 }}>ID verification: {cl.id_required === false ? 'not required in this club' : 'required before you can predict'}.</Dim>
              {Number(cl.commission_pct) > 0 ? <Dim style={{ marginTop: 10 }}>Club fee: {cl.commission_pct}% of winnings is kept by the club.</Dim> : null}
              {approved && cl.referral ? (
                <Card onPress={() => navigation.navigate('Referral', { clubId: id })} style={{ marginTop: 12, borderColor: colors.success + '88' }}>
                  <T style={{ fontWeight: '800' }}>Refer friends, earn diamonds 🎁</T>
                  <Dim style={{ marginTop: 2 }}>Earn {cl.referral.text}. Tap to get your link.</Dim>
                </Card>
              ) : null}
              {approved && cl.join_qr_svg ? (
                <>
                  <SectionHeader title="Invite to this club" />
                  <Card style={{ alignItems: 'center' }}>
                    <T style={{ fontWeight: '800' }}>Club join QR code</T>
                    {/* white square with a quiet zone so any phone camera can read it on the dark screen */}
                    <View accessible accessibilityRole="image" accessibilityLabel={`QR code to join ${cl.name}`} style={{ marginTop: 10, backgroundColor: '#fff', borderRadius: 12, padding: 8 }}>
                      <SvgXml xml={cl.join_qr_svg} width={200} height={200} />
                    </View>
                    <Dim style={{ marginTop: 10, textAlign: 'center' }}>Anyone can scan this to sign up and ask to join {cl.name}.{cl.referral ? ' To earn diamonds for invites, use your own QR on Refer & earn.' : ''}</Dim>
                    {cl.join_link ? (
                      <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
                        <Button title="Share club link" kind="ghost" small onPress={() => Share.share({ message: `Join ${cl.name} on PickArena: ${cl.join_link}` }).catch(() => {})} />
                      </View>
                    ) : null}
                  </Card>
                </>
              ) : null}
              {approved ? (
                <>
                  <SectionHeader title="My record here" />
                  <Row style={{ gap: 10 }}>
                    <Stat label="All" value={cl.stats.my_predictions} />
                    <Stat label="Active" value={cl.stats.my_active} />
                    <Stat label="Won" value={cl.stats.my_won} />
                    <Stat label="Lost" value={cl.stats.my_lost} />
                  </Row>
                </>
              ) : null}
              {cl.membership ? (
                <>
                  <SectionHeader title="Membership" />
                  <Button title={cl.membership === 'pending' ? 'Cancel join request' : 'Leave club'} kind="ghost" onPress={askLeave} loading={leave.isPending} />
                  {approved ? <Dim style={{ marginTop: 8 }}>Your diamonds stay in the club if you leave. The owner must approve you again if you rejoin.</Dim> : null}
                </>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
