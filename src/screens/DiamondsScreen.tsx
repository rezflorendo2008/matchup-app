import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { POLL_MS } from '../config';
import { Text, View } from 'react-native';
import { Badge, Button, Card, CardSkeleton, Chip, Dim, EmptyState, ErrorBox, H1, Row, Screen, SectionHeader, T, c, pts, when } from '../ui';
import { ArrowDownIcon, ArrowUpIcon, DiamondIcon, HistoryIcon, PlusIcon, TrophyIcon } from '../icons';
import { colors, radius } from '../theme';
import type { Club, Tx } from '../types';
import { useClubContext } from '../club';

const LABEL: Record<string, string> = {
  grant: 'Diamonds added', deposit: 'Diamonds added', referral: 'Referral bonus 🎁', claim: 'Diamonds claimed',
  prediction: 'Prediction', win: 'Prediction won', lost: 'Prediction lost', refund: 'Returned', adjust: 'Club adjustment',
};
const txIcon = (type: string, n: number) => type === 'win' ? <TrophyIcon size={18} /> : n > 0 ? <ArrowUpIcon size={18} /> : n < 0 ? <ArrowDownIcon size={18} /> : <HistoryIcon size={18} />;
const FILTERS: { key: string; label: string; types: string[] | null }[] = [
  { key: 'all', label: 'All', types: null },
  { key: 'added', label: 'Added', types: ['grant', 'deposit', 'referral'] },
  { key: 'claimed', label: 'Claimed', types: ['claim'] },
  { key: 'predictions', label: 'Predictions', types: ['prediction', 'win', 'lost', 'refund'] },
];

export default function DiamondsScreen({ navigation }: any) {
  const clubsQ = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs'), refetchInterval: POLL_MS });
  const approved = (clubsQ.data ?? []).filter((x) => x.membership === 'approved');
  const [clubId, setClubId] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');
  const { active } = useClubContext();
  const club = approved.find((x) => x.id === clubId) ?? approved.find((x) => x.id === active?.id) ?? approved[0];
  const total = approved.reduce((a, x) => a + Number(x.balance ?? 0), 0);

  const tx = useQuery({ enabled: !!club, queryKey: ['tx', club?.id], refetchInterval: POLL_MS, queryFn: () => api.get<{ data: Tx[] }>(`/clubs/${club!.id}/wallet/transactions`) });
  const reqs = useQuery({ enabled: !!club, queryKey: ['tx', club?.id, 'requests'], queryFn: () => api.get<{ id: number; amount: number; status: string; created_at: string }[]>(`/clubs/${club!.id}/requests`) });
  const refresh = () => { clubsQ.refetch(); tx.refetch(); reqs.refetch(); };

  const types = FILTERS.find((f) => f.key === filter)?.types;
  const rows = (tx.data?.data ?? []).filter((t) => !types || types.includes(t.type));

  return (
    // opened from the header diamond pill (no longer a bottom-menu tab): back arrow + title
    <Screen title="My diamonds" onRefresh={refresh} refreshing={clubsQ.isRefetching}>
      {clubsQ.isLoading ? <CardSkeleton rows={2} /> : clubsQ.error ? <ErrorBox error={clubsQ.error} onRetry={refresh} />
        : !club ? (
          <EmptyState icon={<DiamondIcon size={26} color={colors.dim} />} title="No diamonds yet" text="Join a club and get verified to receive diamonds from the club owner."
            actionLabel="Find a club" onAction={() => navigation.navigate('Clubs')} />
        ) : (
          <>
            <View style={{ backgroundColor: colors.elevated, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary, opacity: 0.2 }} />
              <Dim>{approved.length > 1 ? 'Total diamonds' : club.name}</Dim>
              <Row style={{ marginTop: 6 }}>
                <DiamondIcon size={34} color={colors.primarySoft} />
                <Text style={{ color: colors.text, fontSize: 40, fontWeight: '800', marginLeft: 10, letterSpacing: -1 }}>{pts(total)}</Text>
              </Row>
              <Button title="Request diamonds" onPress={() => navigation.navigate('AddDiamonds')} style={{ marginTop: 16 }} />
              <Dim style={{ marginTop: 10, fontSize: 12 }}>Virtual only. The club owner or an agent adds them.</Dim>
            </View>

            {approved.length > 1 ? (
              <>
                <SectionHeader title="Club" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                  {approved.map((x) => <Chip key={x.id} label={`${x.name} · ${pts(x.balance)}`} active={x.id === club.id} onPress={() => setClubId(x.id)} />)}
                </ScrollView>
              </>
            ) : null}
            {(reqs.data ?? []).filter((r) => r.status === 'pending').map((r) => (
              <Card key={r.id} style={{ marginTop: 12, borderColor: colors.amber + '66' }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row><PlusIcon size={16} color={colors.amber} /><T style={{ marginLeft: 6, fontWeight: '700' }}>Requested {pts(r.amount)} 💎</T></Row>
                  <Badge text="pending" />
                </Row>
                <Dim style={{ marginTop: 4 }}>{when(r.created_at)}</Dim>
              </Card>
            ))}

            <SectionHeader title="History" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }}>
              {FILTERS.map((f) => <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />)}
            </ScrollView>
            {tx.isLoading ? <CardSkeleton rows={3} /> : rows.length === 0 ? <EmptyState text="Nothing here yet." />
              : rows.map((t) => {
                const n = Number(t.amount);
                return (
                  <Card key={t.id}>
                    <Row>
                      <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>{txIcon(t.type, n)}</View>
                      <View style={{ flex: 1 }}>
                        <T style={{ fontWeight: '700' }}>{LABEL[t.type] ?? t.type.replace(/_/g, ' ')}</T>
                        {t.note ? <Dim numberOfLines={2}>{t.note}</Dim> : null}
                        {t.type === 'lost' ? <Dim><Text style={{ color: colors.danger, fontWeight: '800' }}>{pts(t.lost_amount ?? 0)} 💎 lost</Text>, used when you predicted</Dim> : null}
                        <Dim>{when(t.created_at)}</Dim>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <T style={{ fontWeight: '800', color: n > 0 ? c.good : n < 0 ? c.bad : c.dim }}>{t.type === 'lost' ? 'No change' : `${n > 0 ? '+' : ''}${pts(n)}`}</T>
                        <Dim>bal {pts(t.balance_after)}</Dim>
                      </View>
                    </Row>
                  </Card>
                );
              })}
          </>
        )}
    </Screen>
  );
}
