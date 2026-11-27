import React, { useState } from 'react';
import { Image, Pressable, Share, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { POLL_MS } from '../config';
import { EventGroups } from '../components/EventGroups';
import { Badge, Button, Card, CardSkeleton, Chip, ClubAvatar, ClubVerificationBadge, Dim, EmptyState, ErrorBox, Row, Screen, SectionHeader, T, c, pts, whenShort } from '../ui';
import { CheckIcon, ChevronRightIcon, DiamondIcon, TrophyIcon, UsersIcon } from '../icons';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../theme';
import type { ClubProfile } from '../types';
import { showAlert, showToast } from '../dialog';
import { useActiveClub, useClubContext } from '../club';
import { RequestDiamondsSheet } from '../components/RequestDiamondsSheet';

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

/** Small rounded fact: game type, member count, or the club ID (tap to copy). */
function MetaChip({ children, onPress, label }: { children: React.ReactNode; onPress?: () => void; label?: string }) {
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2, borderRadius: 999, paddingHorizontal: 11, minHeight: 34 };
  return onPress
    ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1 }]}>{children}</Pressable>
    : <View style={style}>{children}</View>;
}
const chipText = { color: colors.text, fontSize: 12.5, fontWeight: '700' as const };
const copyId = (code: string) => Clipboard.setStringAsync(code).then(() => showToast('Club ID copied')).catch(() => showToast('Copy did not work', 'danger'));

/** One line of the About list: label and hint on the left, the value on the right. */
const InfoRow = ({ label, value, hint, first }: { label: string; value: React.ReactNode; hint?: string; first?: boolean }) => (
  <Row style={{ paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line, gap: 12 }}>
    <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{label}</T>{hint ? <Dim style={{ fontSize: 12.5 }}>{hint}</Dim> : null}</View>
    {typeof value === 'string' ? <T style={{ fontWeight: '800', maxWidth: '50%', textAlign: 'right' }}>{value}</T> : value}
  </Row>
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
  const [allPast, setAllPast] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);   // request diamonds popup
  const ctx = useClubContext();
  const setActiveClub = useActiveClub((s) => s.set);
  const q = useQuery({ queryKey: ['club', id], refetchInterval: POLL_MS, queryFn: () => api.get<ClubProfile>(`/clubs/${id}/profile`) });
  const refresh = () => ['club', 'clubs', 'matches', 'home', 'wallets', 'leaderboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const join = useMutation({
    mutationFn: (code: string) => api.post('/clubs/join', { club_id: code }),
    onSuccess: () => { refresh(); showAlert('Request sent', 'The club owner must verify you before you can make predictions.'); },
    onError: (e) => showAlert('Could not join', errMsg(e)),
  });
  const leave = useMutation({
    mutationFn: () => api.del(`/clubs/${id}/membership`),
    onSuccess: () => { refresh(); showAlert('Done', 'You have left the club.'); navigation.goBack(); },
    onError: (e) => showAlert('Could not leave', errMsg(e)),
  });

  const cl = q.data;
  const approved = cl?.membership === 'approved';
  const open = (m: { id: number }, side?: 'a' | 'b') => navigation.navigate('Prediction', { id: m.id, side });
  const askLeave = () => cl && showAlert(cl.membership === 'pending' ? 'Cancel your request?' : `Leave ${cl.name}?`,
    approved ? `Your ${pts(cl.balance)} diamonds stay in the club. You can't predict here while you're away.` : undefined,
    [{ text: 'Stay', style: 'cancel' }, { text: cl.membership === 'pending' ? 'Cancel request' : 'Leave club', style: 'destructive', onPress: () => leave.mutate() }]);

  const isHere = !ctx.multi || ctx.active?.id === id;
  const game: [string, string] = cl?.club_pays ? ['Club multiplier', 'Win and the club pays your diamonds times the multiplier.'] : ['Player vs player', 'Your diamonds are matched against other players. Winners take the matched diamonds.'];
  const members = Number(cl?.stats.members ?? 0);
  const tabs: [Tab, string][] = approved ? [['matches', 'Matches'], ['board', 'Leaderboard'], ['about', 'About']] : [['about', 'About']];
  const active: Tab = approved ? tab : 'about';

  return (
    <Screen title="Club" onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <CardSkeleton rows={3} kind="club" /> : q.error || !cl ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : (
        <>
          {/* header card: banner, logo, name and tagline, then the quick facts (game type, size, club ID to copy) */}
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', marginBottom: 12 }}>
            {cl.banner ? <Image source={{ uri: cl.banner }} style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.bg2 }} resizeMode="cover" accessibilityLabel={`${cl.name} banner`} /> : null}
            <View style={{ padding: 14 }}>
              <Row style={{ gap: 12 }}>
                <ClubAvatar name={cl.name} logo={cl.logo} size={60} />
                <View style={{ flex: 1 }}>
                  <Row><Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', flexShrink: 1, letterSpacing: -0.3 }} numberOfLines={2}>{cl.name}</Text>{cl.status === 'active' ? <ClubVerificationBadge /> : null}</Row>
                  {cl.tagline ? <Dim style={{ marginTop: 3 }} numberOfLines={2}>{cl.tagline}</Dim> : null}
                </View>
              </Row>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                <MetaChip><Text style={chipText}>{game[0]}</Text></MetaChip>
                <MetaChip><UsersIcon size={14} color={colors.dim} /><Text style={chipText}>{pts(members)} member{members === 1 ? '' : 's'}</Text></MetaChip>
                <MetaChip onPress={() => copyId(cl.club_code)} label={`Copy club ID ${cl.club_code}`}><Text style={chipText}>ID {cl.club_code}</Text><Text style={{ color: colors.primarySoft, fontWeight: '800', fontSize: 12.5 }}>⧉ Copy</Text></MetaChip>
              </View>
              {cl.status !== 'active' ? <Dim style={{ marginTop: 8 }}>Club {cl.status}</Dim> : null}

              {approved ? (
                // your diamonds and your record here, with the most common action next to the balance
                <View style={{ marginTop: 14, backgroundColor: colors.bg2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View>
                      <Dim style={{ fontSize: 12.5 }}>Your diamonds here</Dim>
                      <Row style={{ marginTop: 2 }}><DiamondIcon size={22} color={colors.primarySoft} /><Text style={{ color: colors.text, fontWeight: '800', fontSize: 28, marginLeft: 8, letterSpacing: -0.5 }}>{pts(cl.balance)}</Text></Row>
                    </View>
                    <Button title="＋ Request" small style={{ paddingHorizontal: 18, minHeight: 44 }} onPress={() => setReqOpen(true)} />
                  </Row>
                  <Row style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
                    {([['Predictions', cl.stats.my_predictions, colors.text], ['Active', cl.stats.my_active, colors.primarySoft], ['Won', cl.stats.my_won, colors.success], ['Lost', cl.stats.my_lost, cl.stats.my_lost ? colors.danger : colors.text]] as [string, number, string][]).map(([l, v, col]) => (
                      <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ color: col, fontWeight: '800', fontSize: 18 }}>{pts(v)}</Text>
                        <Dim style={{ fontSize: 11.5 }}>{l}</Dim>
                      </View>
                    ))}
                  </Row>
                  <Row style={{ marginTop: 10, gap: 6 }}><CheckIcon size={15} color={colors.success} /><Text style={{ color: colors.success, fontWeight: '700', fontSize: 12.5 }}>Verified member</Text></Row>
                </View>
              ) : null}
              {approved && cl.referral ? (
                // referrals on: one tidy row in the header card (not a loose button)
                <Pressable onPress={() => navigation.navigate('Referral', { clubId: cl.id })} accessibilityRole="button" accessibilityLabel={`Invite friends to ${cl.name} and earn diamonds`}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 56,
                    backgroundColor: colors.success + '14', borderWidth: 1, borderColor: colors.success + '55', borderRadius: radius.md, opacity: pressed ? 0.85 : 1 })}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.success + '26', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 19 }}>🎁</Text></View>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontWeight: '800' }}>Invite friends</T>
                    <Dim style={{ fontSize: 12.5 }} numberOfLines={2}>Earn {cl.referral.text}</Dim>
                  </View>
                  <ChevronRightIcon size={18} />
                </Pressable>
              ) : null}
              {!approved && !cl.membership ? (
                <>
                  <Button title="Request to join" style={{ marginTop: 14 }} onPress={() => join.mutate(cl.club_code)} loading={join.isPending} />
                  <Dim style={{ marginTop: 8 }}>The club owner verifies you first. Then you can see matches and make predictions.</Dim>
                </>
              ) : null}
            </View>
          </View>

          {cl.membership && !approved ? (
            <Card style={{ borderColor: colors.amber + '66' }}>
              <Row style={{ justifyContent: 'space-between' }}><T style={{ fontWeight: '700' }}>Request sent</T><Badge text={cl.membership} /></Row>
              <Dim style={{ marginTop: 4 }}>Waiting for the club owner to verify you. Matches and the leaderboard unlock once you are approved.</Dim>
            </Card>
          ) : null}

          {/* enter this club: only when you're in several clubs and this isn't the one you're in */}
          {approved && !isHere ? (
            <Button title="Enter this club" style={{ marginBottom: 4 }}
              onPress={() => { setActiveClub(cl.id); showToast(`You're now in ${cl.name}`); navigation.navigate('Tabs', { screen: 'Home' }); }} />
          ) : null}

          {approved ? <TabBar value={active} onChange={setTab} tabs={tabs} /> : null}

          {active === 'matches' ? (
            <>
              {cl.my_current.length > 0 ? (
                <>
                  <SectionHeader title="My current predictions" />
                  {cl.my_current.map((p) => {
                    const full = Number(p.matched_amount) >= Number(p.amount);
                    const col = full ? colors.success : colors.primarySoft;
                    return (
                      <Card key={p.id} onPress={() => open({ id: p.match_id })} style={{ paddingVertical: 12 }}>
                        <Row style={{ gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <T style={{ fontWeight: '700' }} numberOfLines={1}>{p.match}</T>
                            <T style={{ fontWeight: '700', fontSize: 14, marginTop: 3 }}>Your pick: {p.side_name} · {pts(p.amount)} 💎</T>
                            <Dim style={{ fontSize: 12.5 }}>{whenShort(p.created_at)}</Dim>
                          </View>
                          <View style={{ borderWidth: 1, borderColor: col + '66', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                            <Text style={{ color: col, fontWeight: '800', fontSize: 11.5 }}>{full ? 'Fully matched' : `Matched ${pts(p.matched_amount)} of ${pts(p.amount)}`}</Text>
                          </View>
                          <ChevronRightIcon size={18} />
                        </Row>
                      </Card>
                    );
                  })}
                </>
              ) : null}
              <SectionHeader title="Open and upcoming" />
              {cl.current_matches.length === 0
                ? <EmptyState title="Nothing open right now" text="New events and matches from this club will appear here." />
                : <EventGroups matches={cl.current_matches} onOpen={open} hideClub />}
              {cl.past_matches.length > 0 ? (
                <>
                  <SectionHeader title="Ended in the last 7 days" />
                  <EventGroups matches={allPast ? cl.past_matches : cl.past_matches.slice(0, 3)} onOpen={open} hideClub />
                  {cl.past_matches.length > 3 ? (
                    <Button title={allPast ? 'Show fewer' : `Show all ${cl.past_matches.length} finished matches`} kind="ghost" small onPress={() => setAllPast(!allPast)} />
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {active === 'board' ? <Leaderboard clubId={id} /> : null}

          {active === 'about' ? (
            <>
              <SectionHeader title="About this club" />
              <Row style={{ gap: 10 }}>
                <Stat label="Members" value={pts(cl.stats.members)} />
                <Stat label="Matches" value={pts(cl.stats.matches)} />
                <Stat label="Predictions" value={pts(cl.stats.club_predictions)} />
              </Row>
              <Card style={{ marginTop: 10, paddingVertical: 2 }}>
                <InfoRow first label="Game type" value={game[0]} hint={game[1]} />
                <InfoRow label="ID check" value={cl.id_required === false ? 'Not needed' : 'Required'} hint={cl.id_required === false ? 'You can predict without sending an ID.' : 'Verify your ID before your first prediction.'} />
                {Number(cl.commission_pct) > 0 ? <InfoRow label="Club fee" value={`${cl.commission_pct}%`} hint="Kept by the club from winnings." /> : null}
                <InfoRow label="Club ID" hint="Friends join with this ID."
                  value={<MetaChip onPress={() => copyId(cl.club_code)} label={`Copy club ID ${cl.club_code}`}><Text style={chipText}>{cl.club_code}</Text><Text style={{ color: colors.primarySoft, fontWeight: '800' }}>⧉</Text></MetaChip>} />
              </Card>
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
              {cl.membership ? (
                // leaving is rare and final: a quiet red action at the very end, with a confirm
                <View style={{ marginTop: 18, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.line }}>
                  <Pressable onPress={askLeave} accessibilityRole="button" disabled={leave.isPending} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
                    <Text style={{ color: colors.danger, fontWeight: '800', fontSize: 15 }}>{leave.isPending ? 'Leaving…' : cl.membership === 'pending' ? 'Cancel join request' : 'Leave club'}</Text>
                  </Pressable>
                  {approved ? <Dim>Your diamonds stay in the club if you leave. The owner must approve you again if you rejoin.</Dim> : null}
                </View>
              ) : null}
            </>
          ) : null}
        </>
      )}
      {reqOpen && cl ? <RequestDiamondsSheet clubId={cl.id} onClose={() => setReqOpen(false)} /> : null}
    </Screen>
  );
}
