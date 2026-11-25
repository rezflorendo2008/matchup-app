import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { Badge, Button, Card, CardSkeleton, ClubAvatar, ClubVerificationBadge, Dim, ErrorBox, Field, H1, Row, Screen, SectionHeader, T, pts } from '../ui';
import { DiamondIcon, SearchIcon } from '../icons';
import { colors, radius } from '../theme';
import type { Club } from '../types';

export default function ClubsScreen({ route, navigation }: any) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Club | null>(null);
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs') });

  const refresh = () => ['clubs', 'matches', 'home', 'wallets'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const search = useMutation({
    mutationFn: (id: string) => api.get<Club>(`/clubs/search?club_id=${encodeURIComponent(id.trim())}`),
    onSuccess: setFound,
    onError: (e) => { setFound(null); Alert.alert('Not found', errMsg(e)); },
  });
  const join = useMutation({
    mutationFn: (body: { club_id?: string; slug?: string }) => api.post<Club>('/clubs/join', body),
    onSuccess: (c) => { setFound(c); refresh(); Alert.alert('Request sent', c.membership === 'approved' ? 'You are already verified in this club.' : 'The club owner must verify you before you can make predictions.'); },
    onError: (e) => Alert.alert('Could not join', errMsg(e)),
  });

  const leave = useMutation({
    mutationFn: (id: number) => api.del(`/clubs/${id}/membership`),
    onSuccess: () => { refresh(); Alert.alert('Done', 'You have left the club.'); },
    onError: (e) => Alert.alert('Could not leave', errMsg(e)),
  });
  const askLeave = (cl: Club) => Alert.alert(
    cl.membership === 'pending' ? 'Cancel your request?' : `Leave ${cl.name}?`,
    cl.membership === 'approved' ? `Your ${pts(cl.balance)} diamonds stay in the club. If you rejoin later and the owner approves, they come back. You can't predict here while you're away.` : undefined,
    [{ text: 'Stay', style: 'cancel' }, { text: cl.membership === 'pending' ? 'Cancel request' : 'Leave club', style: 'destructive', onPress: () => leave.mutate(cl.id) }]);

  // opened from an owner's sign-up link (pickarena://join/<slug>)
  const slug: string | undefined = route?.params?.slug;
  useEffect(() => { if (slug) join.mutate({ slug }); }, [slug]);

  const ClubTitle = ({ club }: { club: Club }) => (
    <Row style={{ flex: 1 }}>
      <ClubAvatar name={club.name} logo={club.logo} size={44} />
      <View style={{ flex: 1 }}>
        <Row><T style={{ fontWeight: '800', fontSize: 16, flexShrink: 1 }} numberOfLines={1}>{club.name}</T>{club.membership === 'approved' ? <ClubVerificationBadge /> : null}</Row>
        <Dim>ID {club.club_code} · {club.club_pays ? 'Club multiplier' : 'Player vs player'}</Dim>
      </View>
    </Row>
  );

  const list = clubs.data ?? [];
  const hasNone = list.length === 0;
  const joinCard = (
      <Card>
        <Row style={{ marginBottom: 10 }}><SearchIcon /><T style={{ fontWeight: '800', marginLeft: 8 }}>Join with a club ID</T></Row>
        <Field label="Club ID" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Ask the club owner" />
        <Button title="Find club" kind="ghost" onPress={() => search.mutate(code)} loading={search.isPending} disabled={code.trim().length < 3} />
        {found ? (
          <View style={{ marginTop: 14, backgroundColor: colors.bg2, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line }}>
            <Row style={{ justifyContent: 'space-between' }}><Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Club', { id: found.id })}><ClubTitle club={found} /></Pressable>{found.membership ? <Badge text={found.membership} /> : null}</Row>
            {!found.membership ? <Button title="Request to join" small style={{ marginTop: 12 }} onPress={() => join.mutate({ club_id: found.club_code })} loading={join.isPending} /> : null}
          </View>
        ) : null}
      </Card>
  );

  return (
    <Screen onRefresh={() => clubs.refetch()} refreshing={clubs.isRefetching}>
      <H1>Clubs</H1>
      {hasNone && !clubs.isLoading && !clubs.error ? <Dim style={{ marginBottom: 12 }}>Ask your club owner for the club ID, then request to join.</Dim> : null}
      {hasNone && !clubs.isLoading && !clubs.error ? joinCard : null}
      {clubs.isLoading ? <CardSkeleton rows={2} kind="club" /> : clubs.error ? <ErrorBox error={clubs.error} onRetry={() => clubs.refetch()} />
        : !hasNone ? (
          <>
            {list.map((cl) => (
              <Card key={cl.id}>
                <Row style={{ justifyContent: 'space-between' }}><Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Club', { id: cl.id })}><ClubTitle club={cl} /></Pressable>{cl.membership !== 'approved' && cl.membership ? <Badge text={cl.membership} /> : null}</Row>
                {cl.status !== 'active' ? <Dim style={{ marginTop: 6 }}>Club {cl.status}</Dim> : null}
                {cl.membership === 'approved' ? (
                  <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
                    <Row><DiamondIcon size={18} color={colors.primarySoft} /><Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, marginLeft: 8 }}>{pts(cl.balance)}</Text><Dim style={{ marginLeft: 6 }}>diamonds</Dim></Row>
                    <Pressable onPress={() => askLeave(cl)} hitSlop={8}><Text style={{ color: colors.dim, fontWeight: '600' }}>Leave</Text></Pressable>
                  </Row>
                ) : (
                  <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
                    <Dim style={{ flex: 1 }}>Waiting for the club owner to verify you.</Dim>
                    <Pressable onPress={() => askLeave(cl)} hitSlop={8}><Text style={{ color: colors.dim, fontWeight: '600' }}>Cancel</Text></Pressable>
                  </Row>
                )}
              </Card>
            ))}
            <SectionHeader title="Join another club" />
            {joinCard}
          </>
        ) : null}
    </Screen>
  );
}
