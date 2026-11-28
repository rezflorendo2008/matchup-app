import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { POLL_MS } from '../config';
import { Badge, Button, Card, CardSkeleton, Chip, ClubAvatar, Dim, EmptyState, ErrorBox, Row, Screen, SectionHeader, T, c, pts, when } from '../ui';
import { DiamondIcon } from '../icons';
import { colors, radius } from '../theme';

type Overview = {
  code: string; total_earned: number;
  clubs: { club_id: number; name: string; logo: string | null; enabled: boolean; reward_text: string; link: string; qr_svg?: string | null; club_code: string; earned: number; friends: number; verified: number;
    friend_list: { name: string; status: string; earned: number; joined_at: string }[];
    earnings: { type: 'signup' | 'win'; amount: number; friend: string; created_at: string }[] }[];
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <View style={{ flex: 1, backgroundColor: colors.bg2, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: colors.line }}>
    <T style={{ fontWeight: '800', fontSize: 20 }}>{value}</T>
    <Dim style={{ fontSize: 12, marginTop: 2 }}>{label}</Dim>
  </View>
);

/** Affiliate page: share your link, see who joined and what you earned in each club. */
export default function ReferralScreen({ route, navigation }: any) {
  const q = useQuery({ queryKey: ['referrals'], queryFn: () => api.get<Overview>('/referrals'), refetchInterval: POLL_MS });
  const [pick, setPick] = useState<number | null>(route?.params?.clubId ?? null);
  const clubs = q.data?.clubs ?? [];
  const cl = clubs.find((x) => x.club_id === pick) ?? clubs[0];

  const share = () => cl && Share.share({
    message: `Join me on PickArena in ${cl.name}! Use my link: ${cl.link}\nOr enter club ID ${cl.club_code} with my referral code ${q.data?.code}.`,
  }).catch(() => {});

  return (
    <Screen title="Refer & earn" onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <CardSkeleton rows={3} /> : q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} />
        : !cl ? <EmptyState title="No referral rewards yet" text="When a club you are verified in turns on refer-a-friend, your link and earnings show up here." actionLabel="My clubs" onAction={() => navigation.navigate('Tabs', { screen: 'Clubs' })} />
        : (
          <>
            <Row style={{ backgroundColor: colors.elevated, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: colors.line, justifyContent: 'space-between' }}>
              <View>
                <Dim>Total earned from referrals</Dim>
                <Row style={{ marginTop: 4 }}><DiamondIcon size={26} color={colors.primarySoft} /><Text style={{ color: colors.text, fontSize: 32, fontWeight: '800', marginLeft: 8 }}>{pts(q.data!.total_earned)}</Text></Row>
              </View>
            </Row>

            {clubs.length > 1 ? (
              <Row style={{ marginTop: 12, flexWrap: 'wrap' }}>{clubs.map((x) => <Chip key={x.club_id} label={x.name} active={x.club_id === cl.club_id} onPress={() => setPick(x.club_id)} />)}</Row>
            ) : null}

            <Card style={{ marginTop: 12 }}>
              <Row><ClubAvatar name={cl.name} logo={cl.logo} size={40} /><View style={{ flex: 1, marginLeft: 10 }}><T style={{ fontWeight: '800' }}>{cl.name}</T><Dim>{cl.enabled ? `Earn ${cl.reward_text}` : 'Referrals are switched off for this club'}</Dim></View></Row>
              {cl.enabled ? (
                <>
                  <View style={{ marginTop: 14, backgroundColor: colors.bg2, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.line }}>
                    <Dim style={{ fontSize: 12 }}>Your referral code</Dim>
                    <Text selectable style={{ color: colors.text, fontWeight: '800', fontSize: 24, letterSpacing: 3, marginTop: 2 }}>{q.data!.code}</Text>
                  </View>
                  {cl.qr_svg ? (
                    <View style={{ marginTop: 14, alignItems: 'center', backgroundColor: colors.bg2, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line }}>
                      <T style={{ fontWeight: '800' }}>Scan to join</T>
                      {/* white square with a quiet zone so any phone camera can read it on the dark screen */}
                      <View accessible accessibilityRole="image" accessibilityLabel={`QR code to join ${cl.name} with your referral code`}
                        style={{ marginTop: 10, backgroundColor: '#fff', borderRadius: 12, padding: 8 }}>
                        <SvgXml xml={cl.qr_svg} width={220} height={220} />
                      </View>
                      <Dim style={{ marginTop: 10, textAlign: 'center', fontSize: 12 }}>Friends scan this with their phone camera to sign up in {cl.name} with your code.</Dim>
                    </View>
                  ) : null}
                  <Button title="Share my link" onPress={share} style={{ marginTop: 12 }} />
                  <Dim style={{ marginTop: 8, fontSize: 12 }}>Friends can also enter your code when they join with club ID {cl.club_code}. You earn once the club owner verifies them.</Dim>
                </>
              ) : null}
            </Card>

            <SectionHeader title="Your results here" />
            <Row style={{ gap: 10 }}>
              <Stat label="Friends invited" value={cl.friends} />
              <Stat label="Verified" value={cl.verified} />
              <Stat label="Earned 💎" value={pts(cl.earned)} />
            </Row>
            <Dim style={{ marginTop: 8 }}>Earnings are added to your diamonds in {cl.name} and show in your diamond history.</Dim>

            {cl.friend_list.length > 0 ? (
              <>
                <SectionHeader title="My friends" />
                <Card style={{ paddingVertical: 4 }}>
                  {cl.friend_list.map((f, i) => (
                    <Row key={i} style={{ paddingVertical: 10, justifyContent: 'space-between', borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                      <View style={{ flex: 1, marginRight: 8 }}><T style={{ fontWeight: '700' }} numberOfLines={1}>{f.name}</T><Dim style={{ fontSize: 12 }}>{when(f.joined_at)}</Dim></View>
                      <View style={{ alignItems: 'flex-end' }}><Badge text={f.status === 'approved' ? 'verified' : f.status} />{f.earned > 0 ? <T style={{ color: c.good, fontWeight: '800', marginTop: 4 }}>+{pts(f.earned)} 💎</T> : null}</View>
                    </Row>
                  ))}
                </Card>
              </>
            ) : null}

            {cl.earnings.length > 0 ? (
              <>
                <SectionHeader title="Recent earnings" />
                {cl.earnings.map((e, i) => (
                  <Card key={i} style={{ paddingVertical: 12 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: 8 }}><T style={{ fontWeight: '700' }}>{e.type === 'win' ? `${e.friend} won a prediction` : `${e.friend} joined`}</T><Dim style={{ fontSize: 12 }}>{when(e.created_at)}</Dim></View>
                      <T style={{ color: c.good, fontWeight: '800' }}>+{pts(e.amount)} 💎</T>
                    </Row>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}
    </Screen>
  );
}
