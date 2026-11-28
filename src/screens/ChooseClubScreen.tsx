import React, { useCallback } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useClubContext, useActiveClub } from '../club';
import { showToast } from '../dialog';
import { Button, Card, ClubAvatar, ClubVerificationBadge, Dim, PressScale, Row, Screen, T, pts } from '../ui';
import { colors } from '../theme';

/** With 2+ clubs: pick the club to enter. Its matches and diamonds are what you see until you switch. */
export default function ChooseClubScreen({ navigation }: any) {
  const { approved, active, needsPick } = useClubContext();
  const setActive = useActiveClub((s) => s.set);
  // while a club still has to be chosen, Android's back button can't skip this screen
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => needsPick);
    return () => sub.remove();
  }, [needsPick]));
  const enter = (id: number, name: string) => {
    setActive(id);
    showToast(`You're in ${name}`);
    // entering a club always starts on its Home page
    navigation.navigate('Tabs', { screen: 'Home' });
  };
  return (
    <Screen title={active ? 'Switch club' : 'Choose a club'} hideBack={needsPick}>
      <Dim style={{ marginBottom: 6 }}>You're in {approved.length} clubs. Pick one to see its matches and diamonds. You can switch any time from the top bar.</Dim>
      {approved.map((c) => {
        const on = active?.id === c.id;
        return (
          <PressScale key={c.id} onPress={() => enter(c.id, c.name)} scaleTo={0.985} accessibilityLabel={`Enter ${c.name}`}>
            <Card style={{ marginTop: 12, borderColor: on ? colors.primary : colors.line }}>
              <Row>
                <ClubAvatar name={c.name} logo={c.logo} size={48} />
                <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                  <Row><T style={{ fontWeight: '800', fontSize: 16, flexShrink: 1 }} numberOfLines={1}>{c.name}</T><ClubVerificationBadge size={15} /></Row>
                  <Dim style={{ fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>ID {c.club_code} · {c.club_pays ? 'Club multiplier' : 'Player vs player'}</Dim>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>{pts(c.balance)} 💎</Text>
                  <Dim style={{ fontSize: 12 }}>diamonds</Dim>
                </View>
              </Row>
              <View pointerEvents="none" style={{ marginTop: 12 }}>
                <Button small title={on ? 'You are here · Enter' : 'Enter club'} kind={on ? 'ghost' : 'primary'} onPress={() => {}} />
              </View>
            </Card>
          </PressScale>
        );
      })}
    </Screen>
  );
}
