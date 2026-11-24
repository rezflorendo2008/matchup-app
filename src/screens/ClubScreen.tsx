import React from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { POLL_MS } from '../config';
import { EventGroups } from '../components/EventGroups';
import { Badge, Button, Card, CardSkeleton, ClubAvatar, ClubVerificationBadge, Dim, EmptyState, ErrorBox, H1, Row, Screen, SectionHeader, T, pts, whenShort } from '../ui';
import { DiamondIcon } from '../icons';
import { colors, radius } from '../theme';
import type { ClubProfile } from '../types';

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <View style={{ flex: 1, backgroundColor: colors.bg2, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.line }}>
    <T style={{ fontWeight: '800', fontSize: 20 }}>{value}</T>
    <Dim style={{ fontSize: 12, marginTop: 2 }}>{label}</Dim>
  </View>
);

/** Club profile: totals, my predictions, current events and matches, and what ended in the last 7 days. */
export default function ClubScreen({ route, navigation }: any) {
  const id: number = route.params.id;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['club', id], refetchInterval: POLL_MS, queryFn: () => api.get<ClubProfile>(`/clubs/${id}/profile`) });
  const refresh = () => ['club', 'clubs', 'matches', 'home', 'wallets'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const join = useMutation({
    mutationFn: (code: string) => api.post('/clubs/join', { club_id: code }),
    onSuccess: () => { refresh(); Alert.alert('Request sent', 'The club owner must verify you before you can make predictions.'); },
    onError: (e) => Alert.alert('Could not join', errMsg(e)),
  });
  const leave = useMutation({
    mutationFn: () => api.del(`/clubs/${id}/membership`),
    onSuccess: () => { refresh(); Alert.alert('Done', 'You have left the club.'); },
    onError: (e) => Alert.alert('Could not leave', errMsg(e)),
  });

  const cl = q.data;
  const open = (m: { id: number }, side?: 'a' | 'b') => navigation.navigate('Prediction', { id: m.id, side });
  const askLeave = () => cl && Alert.alert(cl.membership === 'pending' ? 'Cancel your request?' : `Leave ${cl.name}?`,
    cl.membership === 'approved' ? `Your ${pts(cl.balance)} diamonds stay in the club. You can't predict here while you're away.` : undefined,
    [{ text: 'Stay', style: 'cancel' }, { text: cl.membership === 'pending' ? 'Cancel request' : 'Leave club', style: 'destructive', onPress: () => leave.mutate() }]);

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Button title="‹ Back" kind="ghost" onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, marginBottom: 10 }} />
      {q.isLoading ? <CardSkeleton rows={3} kind="club" /> : q.error || !cl ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          <Card>
            <Row>
              <ClubAvatar name={cl.name} logo={cl.logo} size={64} />
              <View style={{ flex: 1 }}>
                <Row><H1>{cl.name}</H1>{cl.status === 'active' ? <ClubVerificationBadge /> : null}</Row>
                <Dim>ID {cl.club_code} · {cl.club_pays ? 'Club multiplier' : 'Player vs player'}</Dim>
              </View>
            </Row>
            {cl.tagline ? <T style={{ marginTop: 12, lineHeight: 21 }}>{cl.tagline}</T> : null}
            {cl.status !== 'active' ? <Dim style={{ marginTop: 8 }}>Club {cl.status}</Dim> : null}
            <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
              {cl.membership ? <Badge text={cl.membership} /> : <Dim>You are not a member yet</Dim>}
              {cl.membership === 'approved' ? (
                <Row><DiamondIcon size={16} color={colors.primarySoft} /><T style={{ fontWeight: '800', marginLeft: 6 }}>{pts(cl.balance)}</T><Dim style={{ marginLeft: 4 }}>in this club</Dim></Row>
              ) : null}
            </Row>
            {!cl.membership ? <Button title="Request to join" style={{ marginTop: 12 }} onPress={() => join.mutate(cl.club_code)} loading={join.isPending} /> : null}
            {cl.membership === 'pending' ? <Dim style={{ marginTop: 10 }}>Waiting for the club owner to verify you. Matches show up here once you are approved.</Dim> : null}
          </Card>

          <SectionHeader title="Club totals" />
          <Row style={{ gap: 10 }}>
            <Stat label="Total predictions" value={cl.stats.club_predictions} />
            <Stat label="Members" value={cl.stats.members} />
            <Stat label="Matches" value={cl.stats.matches} />
          </Row>

          {cl.membership === 'approved' ? (
            <>
              <SectionHeader title="My predictions here" />
              <Row style={{ gap: 10 }}>
                <Stat label="All" value={cl.stats.my_predictions} />
                <Stat label="Active" value={cl.stats.my_active} />
                <Stat label="Won" value={cl.stats.my_won} />
                <Stat label="Lost" value={cl.stats.my_lost} />
              </Row>
              {cl.my_current.length > 0 ? (
                <Card style={{ marginTop: 12 }}>
                  <T style={{ fontWeight: '800', marginBottom: 6 }}>My current predictions</T>
                  {cl.my_current.map((p) => (
                    <Card key={p.id} onPress={() => open({ id: p.match_id })} style={{ marginBottom: 8, backgroundColor: colors.bg2 }}>
                      <T style={{ fontWeight: '700' }} numberOfLines={1}>{p.match}</T>
                      <Dim>{p.side_name} · {pts(p.amount)} 💎 · matched {pts(p.matched_amount)} · {whenShort(p.created_at)}</Dim>
                    </Card>
                  ))}
                </Card>
              ) : null}

              <SectionHeader title="Current events and matches" />
              {cl.current_matches.length === 0
                ? <EmptyState title="Nothing open right now" text="New events and matches from this club will appear here." />
                : <EventGroups matches={cl.current_matches} onOpen={open} />}

              <SectionHeader title="Past events (last 7 days)" />
              {cl.past_matches.length === 0
                ? <Dim>No matches ended in the last 7 days.</Dim>
                : <EventGroups matches={cl.past_matches} onOpen={open} />}

              <Button title={'Leave club'} kind="ghost" small style={{ marginTop: 18 }} onPress={askLeave} loading={leave.isPending} />
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
