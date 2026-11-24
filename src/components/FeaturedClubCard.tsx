import React from 'react';
import { Text, View } from 'react-native';
import { Badge, Button, ClubAvatar, PressScale, Row } from '../ui';
import { UsersIcon } from '../icons';
import { colors, radius } from '../theme';
import type { FeaturedClub } from '../types';

/** Community-style club card for the horizontal carousel. Verified clubs only (the API lists active clubs). */
export function FeaturedClubCard({ club, onJoin, joining, onOpen }: { club: FeaturedClub; onJoin: () => void; joining?: boolean; onOpen?: () => void }) {
  return (
    <PressScale onPress={onOpen} scaleTo={0.97} style={{ width: 244, marginRight: 12, backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
      <Row>
        <ClubAvatar name={club.name} logo={club.logo} size={46} />
        <View style={{ flex: 1 }}>
          <Row>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, flexShrink: 1 }} numberOfLines={1}>{club.name}</Text>
          </Row>
          <Row style={{ marginTop: 3 }}>
            <UsersIcon size={13} color={colors.dim} />
            <Text style={{ color: colors.dim, fontSize: 12, marginLeft: 4 }}>{club.members} members</Text>
          </Row>
        </View>
      </Row>
      <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 18, marginTop: 10, minHeight: 36 }} numberOfLines={2}>
        {club.tagline || 'Join the community and predict matches together.'}
      </Text>
      <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
        <View style={{ backgroundColor: colors.elevated, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ color: colors.primarySoft, fontSize: 11, fontWeight: '700' }}>{club.club_pays ? 'Club multiplier' : 'Player vs player'}</Text>
        </View>
        {club.membership ? <Badge text={club.membership} /> : null}
      </Row>
      {!club.membership ? <Button small title="Request to join" onPress={onJoin} loading={joining} style={{ marginTop: 12 }} /> : null}
    </PressScale>
  );
}
