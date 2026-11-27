import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { POLL_MS } from '../config';
import { Text, View } from 'react-native';
import { Button, Card, CardSkeleton, Chip, Dim, EmptyState, ErrorBox, Row, Screen, SectionHeader, T, c, pts, when } from '../ui';
import { ArrowDownIcon, ArrowUpIcon, DiamondIcon, HistoryIcon, TrophyIcon } from '../icons';
import { colors, radius } from '../theme';
import type { Club, Tx } from '../types';
import { useClubContext } from '../club';
import { RequestDiamondsSheet } from '../components/RequestDiamondsSheet';

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

/** Detail without repeating the label: "Prediction won: Lions vs Tigers" → "Lions vs Tigers". */
const PREFIX: Record<string, string> = { 'Match cancelled': 'Match cancelled · ', 'Match drawn': 'Draw · ', 'Unmatched diamonds returned': 'Not matched · ' };
function txDetail(note: string | null): string {
  const n = note ?? '';
  const m = n.match(/^(Prediction(?: won| lost)?|Match cancelled|Match drawn|Unmatched diamonds returned):\s*(.+)$/);
  return m ? (PREFIX[m[1]] ?? '') + m[2] : n;
}
function dayLabel(iso: string): string {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const x = new Date(iso); x.setHours(0, 0, 0, 0);
  const diff = Math.round((t.getTime() - x.getTime()) / 86400000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', ...(x.getFullYear() === t.getFullYear() ? {} : { year: 'numeric' }) });
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const PAGE = 25;

export default function DiamondsScreen({ navigation, route }: any) {
  const clubsQ = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs'), refetchInterval: POLL_MS });
  const approved = (clubsQ.data ?? []).filter((x) => x.membership === 'approved');
  const [clubId, setClubId] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(PAGE);
  const [reqOpen, setReqOpen] = useState(!!route?.params?.request);   // request diamonds popup
  useEffect(() => { if (route?.params?.request) setReqOpen(true); }, [route?.params?.request]);
  const { active } = useClubContext();
  const club = approved.find((x) => x.id === clubId) ?? approved.find((x) => x.id === active?.id) ?? approved[0];

  const tx = useQuery({ enabled: !!club, queryKey: ['tx', club?.id], refetchInterval: POLL_MS, queryFn: () => api.get<{ data: Tx[] }>(`/clubs/${club!.id}/wallet/transactions`) });
  const reqs = useQuery({ enabled: !!club, queryKey: ['tx', club?.id, 'requests'], refetchInterval: POLL_MS, queryFn: () => api.get<{ id: number; amount: number; status: string; created_at: string }[]>(`/clubs/${club!.id}/requests`) });
  const refresh = () => { clubsQ.refetch(); tx.refetch(); reqs.refetch(); };

  const types = FILTERS.find((f) => f.key === filter)?.types;
  const rows = (tx.data?.data ?? []).filter((t) => !types || types.includes(t.type));
  const waiting = (reqs.data ?? []).filter((r) => r.status === 'pending');
  // one compact list per day
  const days: { day: string; items: Tx[] }[] = [];
  for (const t of rows.slice(0, limit)) {
    const d = dayLabel(t.created_at);
    if (days[days.length - 1]?.day !== d) days.push({ day: d, items: [] });
    days[days.length - 1].items.push(t);
  }

  return (
    // opened from the header diamond pill (no longer a bottom-menu tab): back arrow + title
    <Screen title="My diamonds" onRefresh={refresh} refreshing={clubsQ.isRefetching}>
      {clubsQ.isLoading ? <CardSkeleton rows={2} /> : clubsQ.error ? <ErrorBox error={clubsQ.error} onRetry={refresh} />
        : !club ? (
          <EmptyState icon={<DiamondIcon size={26} color={colors.dim} />} title="No diamonds yet" text="Join a club and get verified to receive diamonds from the club owner."
            actionLabel="Find a club" onAction={() => navigation.navigate('Tabs', { screen: 'Clubs' })} />
        ) : (
          <>
            {/* which club you're looking at: first, above the balance */}
            {approved.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 10 }}>
                {approved.map((x) => <Chip key={x.id} label={`${x.name} · ${pts(x.balance)}`} active={x.id === club.id} onPress={() => { setClubId(x.id); setLimit(PAGE); }} />)}
              </ScrollView>
            ) : null}
            <View style={{ backgroundColor: colors.elevated, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primary, opacity: 0.2 }} />
              <Dim>Diamonds in {club.name}</Dim>
              <Row style={{ marginTop: 6 }}>
                <DiamondIcon size={34} color={colors.primarySoft} />
                <Text style={{ color: colors.text, fontSize: 40, fontWeight: '800', marginLeft: 10, letterSpacing: -1 }}>{pts(club.balance)}</Text>
              </Row>
              <Button title="＋ Request diamonds" onPress={() => setReqOpen(true)} style={{ marginTop: 16 }} />
              <Dim style={{ marginTop: 10, fontSize: 12 }}>Virtual only. The club owner or an agent adds them.</Dim>
            </View>

            {waiting.length ? (
              <>
                <SectionHeader title="Waiting for the owner" />
                <Card style={{ paddingVertical: 2 }}>
                  {waiting.map((r, i) => (
                    <Row key={r.id} style={{ paddingVertical: 12, gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                      <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.amber + '1F', alignItems: 'center', justifyContent: 'center' }}><HistoryIcon size={18} color={colors.amber} /></View>
                      <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>Requested {pts(r.amount)} 💎</T><Dim style={{ fontSize: 12.5 }}>Sent {when(r.created_at)}</Dim></View>
                      <View style={{ borderWidth: 1, borderColor: colors.amber + '66', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}><Text style={{ color: colors.amber, fontWeight: '800', fontSize: 11.5 }}>Waiting</Text></View>
                    </Row>
                  ))}
                </Card>
              </>
            ) : null}

            <SectionHeader title="History" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4, flexGrow: 0 }}>
              {FILTERS.map((f) => <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => { setFilter(f.key); setLimit(PAGE); }} />)}
            </ScrollView>
            {tx.isLoading ? <CardSkeleton rows={3} /> : rows.length === 0
              ? <EmptyState icon={<HistoryIcon size={26} />} title="No activity yet" text={filter === 'all' ? 'Diamonds added, used and won in this club show up here.' : 'Nothing here yet.'} />
              : days.map((g) => (
                <View key={g.day}>
                  <Text style={{ color: colors.dim, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 14, marginBottom: 8, marginLeft: 2 }}>{g.day}</Text>
                  <Card style={{ paddingVertical: 2 }}>
                    {g.items.map((t, i) => {
                      const n = Number(t.amount), detail = txDetail(t.note);
                      return (
                        <Row key={t.id} style={{ paddingVertical: 12, gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                          <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center' }}>{txIcon(t.type, n)}</View>
                          <View style={{ flex: 1 }}>
                            <T style={{ fontWeight: '700' }}>{LABEL[t.type] ?? t.type.replace(/_/g, ' ')}</T>
                            {detail ? <Dim style={{ fontSize: 13 }} numberOfLines={1}>{detail}</Dim> : null}
                            {t.type === 'lost' ? <Dim style={{ fontSize: 13 }}><Text style={{ color: colors.danger, fontWeight: '800' }}>{pts(t.lost_amount ?? 0)} 💎 lost</Text>, used when you predicted</Dim> : null}
                            <Dim style={{ fontSize: 12 }}>{timeOf(t.created_at)}</Dim>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <T style={{ fontWeight: '800', color: n > 0 ? c.good : n < 0 ? c.bad : c.dim }}>{t.type === 'lost' ? 'No change' : `${n > 0 ? '+' : ''}${pts(n)}`}</T>
                            <Dim style={{ fontSize: 12 }}>Balance {pts(t.balance_after)}</Dim>
                          </View>
                        </Row>
                      );
                    })}
                  </Card>
                </View>
              ))}
            {rows.length > limit ? <Button title={`Show more (${rows.length - limit})`} kind="ghost" small style={{ marginTop: 4 }} onPress={() => setLimit(limit + PAGE)} /> : null}
          </>
        )}
      {reqOpen ? <RequestDiamondsSheet onSent={(id) => { setClubId(id); setLimit(PAGE); }} onClose={() => { setReqOpen(false); refresh(); navigation.setParams?.({ request: undefined }); }} /> : null}
    </Screen>
  );
}
