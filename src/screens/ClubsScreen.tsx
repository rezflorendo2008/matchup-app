import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { Badge, Button, Card, CardSkeleton, ClubAvatar, ClubVerificationBadge, Dim, ErrorBox, Field, H1, Row, Screen, SectionHeader, T, pts } from '../ui';
import { ChevronRightIcon, DiamondIcon, SearchIcon } from '../icons';
import { colors, radius } from '../theme';
import type { Club } from '../types';
import { showAlert, showToast } from '../dialog';
import { useActiveClub, useClubContext } from '../club';

export default function ClubsScreen({ route, navigation }: any) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Club | null>(null);
  const [ref, setRef] = useState<string>(route?.params?.ref ?? '');
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs') });
  const ctx = useClubContext();
  const setActiveClub = useActiveClub((s) => s.set);
  // the join form stays tucked away until asked for (or opened from an invite link)
  const [showJoin, setShowJoin] = useState<boolean>(!!(route?.params?.ref || route?.params?.slug));
  useEffect(() => { if (route?.params?.ref || route?.params?.slug) setShowJoin(true); }, [route?.params?.ref, route?.params?.slug]);

  const refresh = () => ['clubs', 'matches', 'home', 'wallets'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const [codeErr, setCodeErr] = useState<string | null>(null);   // shown under the Club ID box
  const search = useMutation({
    mutationFn: (id: string) => api.get<Club>(`/clubs/search?club_id=${encodeURIComponent(id.trim())}`),
    onSuccess: setFound,
    onError: (e) => { setFound(null); setCodeErr(errMsg(e)); },
  });
  const join = useMutation({
    mutationFn: (body: { club_id?: string; slug?: string; ref?: string }) => api.post<Club>('/clubs/join', body),
    onSuccess: (c) => { setFound(c); refresh(); showAlert('Request sent', c.membership === 'approved' ? 'You are already verified in this club.' : 'The club owner must verify you before you can make predictions.'); },
    onError: (e) => setCodeErr(errMsg(e)),
  });

  // opened from an owner's sign-up link (pickarena://join/<slug>)
  const slug: string | undefined = route?.params?.slug;
  useEffect(() => { if (slug) join.mutate({ slug, ref: ref.trim() || undefined }); }, [slug]);

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
        <Field label="Club ID" value={code} onChangeText={(v) => { setCode(v); setCodeErr(null); }} autoCapitalize="characters" placeholder="Ask the club owner" error={codeErr} />
        <Field label="Referral code (optional)" value={ref} onChangeText={(v) => setRef(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} placeholder="From a friend" />
        <Button title="Find club" kind="ghost" onPress={() => search.mutate(code)} loading={search.isPending} disabled={code.trim().length < 3} />
        {found ? (
          <View style={{ marginTop: 14, backgroundColor: colors.bg2, borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: colors.line }}>
            <Row style={{ justifyContent: 'space-between' }}><Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Club', { id: found.id })}><ClubTitle club={found} /></Pressable>{found.membership ? <Badge text={found.membership} /> : null}</Row>
            {!found.membership ? <Button title="Request to join" small style={{ marginTop: 12 }} onPress={() => join.mutate({ club_id: found.club_code, ref: ref.trim() || undefined })} loading={join.isPending} /> : null}
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
            {list.map((cl) => {
              const here = ctx.multi && ctx.active?.id === cl.id;
              const canEnter = ctx.multi && cl.membership === 'approved' && !here;
              return (
              <Card key={cl.id} onPress={() => navigation.navigate('Club', { id: cl.id })} style={{ paddingVertical: 12, ...(here ? { borderColor: colors.primary } : {}) }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <ClubTitle club={cl} />
                  <ChevronRightIcon />
                </Row>
                <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
                  {cl.membership === 'approved'
                    ? <Row><DiamondIcon size={16} color={colors.primarySoft} /><Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginLeft: 6 }}>{pts(cl.balance)}</Text><Dim style={{ marginLeft: 5 }}>diamonds</Dim></Row>
                    : <Dim style={{ flex: 1 }}>Waiting for the club owner to verify you</Dim>}
                  {cl.membership && cl.membership !== 'approved' ? <Badge text={cl.membership} /> : null}
                  {cl.status !== 'active' ? <Badge text={cl.status} /> : null}
                  {here ? (
                    <View style={{ backgroundColor: colors.success + '22', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ color: colors.success, fontWeight: '800', fontSize: 12 }}>● You're here</Text>
                    </View>
                  ) : null}
                  {canEnter ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Enter ${cl.name}`} hitSlop={6}
                      onPress={() => { setActiveClub(cl.id); showToast(`You're now in ${cl.name}`); }}
                      style={({ pressed }) => ({ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 16, minHeight: 36, justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Enter</Text>
                    </Pressable>
                  ) : null}
                </Row>
              </Card>
              );
            })}
            {showJoin ? (
              <>
                <SectionHeader title="Join another club" />
                {joinCard}
              </>
            ) : <Button title="＋ Join another club" kind="ghost" style={{ marginTop: 4 }} onPress={() => setShowJoin(true)} />}
          </>
        ) : null}
    </Screen>
  );
}
