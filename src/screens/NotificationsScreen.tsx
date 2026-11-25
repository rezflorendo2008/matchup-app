import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { POLL_MS } from '../config';
import { Button, Card, CardSkeleton, Dim, EmptyState, ErrorBox, H1, Row, Screen, T, when } from '../ui';
import { ArrowDownIcon, ArrowUpIcon, BellIcon, CheckBadgeIcon, DiamondIcon, TargetIcon, TrophyIcon, UsersIcon } from '../icons';
import { colors, radius } from '../theme';

type N = { id: number; type: string; title: string; body: string | null; data: Record<string, any>; read: boolean; created_at: string };

const ICON: Record<string, (c: string) => React.ReactNode> = {
  win: (c) => <TrophyIcon size={18} color={c} />, loss: (c) => <ArrowDownIcon size={18} color={c} />, refund: (c) => <ArrowUpIcon size={18} color={c} />,
  diamonds: (c) => <DiamondIcon size={18} color={c} />, match: (c) => <TargetIcon size={18} color={c} />, kyc: (c) => <CheckBadgeIcon size={18} color={c} />,
  membership: (c) => <UsersIcon size={18} color={c} />,
};
const TONE: Record<string, string> = { win: colors.success, loss: colors.dim, refund: colors.primarySoft, diamonds: colors.primarySoft, match: colors.primary, kyc: colors.success, membership: colors.success };

export default function NotificationsScreen({ navigation }: any) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ data: N[]; unread: number }>('/notifications'), refetchInterval: POLL_MS });
  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read', {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });
  const unread = q.data?.unread ?? 0;
  // Opening the centre counts as having seen them: clear the badge after a moment.
  useEffect(() => { if (unread > 0) { const t = setTimeout(() => readAll.mutate(), 2500); return () => clearTimeout(t); } }, [unread]);

  const open = (n: N) => {
    if (n.data?.match_id) navigation.navigate('Prediction', { id: n.data.match_id });
    else if (n.type === 'kyc') navigation.navigate('Verify');
    else if (n.type === 'diamonds') navigation.navigate('Diamonds');
    else if (n.type === 'membership') navigation.navigate('Clubs');
    else if (n.data?.prediction_id) navigation.navigate('History');
  };

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      <Button title="‹ Back" kind="ghost" onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, marginBottom: 10 }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Notifications</H1>
        {unread > 0 ? <Text onPress={() => readAll.mutate()} style={{ color: colors.primarySoft, fontWeight: '700' }}>Mark all read</Text> : null}
      </Row>
      {q.isLoading ? <CardSkeleton rows={4} /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        : (q.data?.data.length ?? 0) === 0 ? <EmptyState icon={<BellIcon size={26} color={colors.dim} />} title="You're all caught up" text="Wins, diamonds, new matches and match start reminders show up here." />
        : q.data!.data.map((n) => {
          const col = TONE[n.type] ?? colors.dim;
          return (
            <Card key={n.id} onPress={() => open(n)} style={{ paddingVertical: 12, borderColor: n.read ? colors.line : col + '88' }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: col + '22', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  {(ICON[n.type] ?? ((c: string) => <BellIcon size={18} color={c} />))(col)}
                </View>
                <View style={{ flex: 1 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T style={{ fontWeight: n.read ? '600' : '800', flex: 1, marginRight: 8 }}>{n.title}</T>
                    {!n.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
                  </Row>
                  {n.body ? <Dim style={{ marginTop: 2 }}>{n.body}</Dim> : null}
                  <Dim style={{ marginTop: 4, fontSize: 12 }}>{when(n.created_at)}</Dim>
                </View>
              </Row>
            </Card>
          );
        })}
    </Screen>
  );
}
