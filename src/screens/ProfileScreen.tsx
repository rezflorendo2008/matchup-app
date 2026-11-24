import React, { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { ORIGIN } from '../config';
import { unregisterPush } from '../push';
import { useAuth } from '../store';
import { Badge, Button, Card, Dim, Field, H1, PressScale, Row, Screen, SectionHeader, T, TeamAvatar } from '../ui';
import { ChevronRightIcon, HistoryIcon, LogOutIcon, ShieldIcon, TrophyIcon } from '../icons';
import { colors, radius } from '../theme';
import type { User } from '../types';

function MenuRow({ icon, label, onPress, hint }: { icon: React.ReactNode; label: string; onPress: () => void; hint?: string }) {
  return (
    <PressScale onPress={onPress} scaleTo={0.985} style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14, marginBottom: 10 }}>
      <Row>
        <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>{icon}</View>
        <View style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{label}</T>{hint ? <Dim>{hint}</Dim> : null}</View>
        <ChevronRightIcon />
      </Row>
    </PressScale>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const signOut = useAuth((s) => s.signOut);
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try { setUser(await api.put<User>('/me', { name: name.trim() })); Alert.alert('Saved'); }
    catch (e) { Alert.alert('Failed', errMsg(e)); } finally { setBusy(false); }
  };
  const logout = async () => {
    await unregisterPush();
    try { await api.post('/auth/logout'); } catch {}
    await signOut(); qc.clear();
  };

  return (
    <Screen>
      <H1>Profile</H1>
      <Card style={{ alignItems: 'center', paddingVertical: 20 }}>
        <TeamAvatar name={user.name} size={72} />
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20, marginTop: 12 }}>{user.name}</Text>
        <Dim style={{ marginTop: 2 }}>{user.email ?? 'No email'} · {user.phone ?? 'No phone'}</Dim>
        <Row style={{ marginTop: 12 }}>
          <Badge text={user.phone_verified ? 'phone ok' : 'phone not verified'} />
          <View style={{ width: 8 }} />
          <Badge text={user.can_predict ? 'verified' : user.kyc_status} />
        </Row>
      </Card>

      {!user.can_predict ? <Button title="Verify my account" onPress={() => navigation.navigate('Verify')} style={{ marginBottom: 12 }} /> : null}

      <SectionHeader title="Activity" />
      <MenuRow icon={<HistoryIcon size={20} color={colors.primarySoft} />} label="Prediction history" hint="Every prediction and its result" onPress={() => navigation.navigate('History')} />
      {user.is_owner ? <MenuRow icon={<TrophyIcon size={20} />} label="Owner subscription" hint="Match limits and plans" onPress={() => navigation.navigate('Subscription')} /> : null}

      <SectionHeader title="Display name" />
      <Field value={name} onChangeText={setName} autoCapitalize="words" />
      <Button title="Save name" kind="ghost" onPress={save} loading={busy} disabled={name.trim().length < 2 || name.trim() === user.name} />

      {user.is_owner ? (
        <Card style={{ marginTop: 18 }}>
          <T style={{ fontWeight: '800' }}>Club owner tools</T>
          <Dim style={{ marginVertical: 4 }}>Manage matches, members, agents and diamonds in the owner panel on the web:</Dim>
          <T selectable style={{ color: colors.primarySoft }}>{ORIGIN}/owner</T>
        </Card>
      ) : null}

      <Card style={{ marginTop: 18 }}>
        <Row style={{ marginBottom: 6 }}><ShieldIcon size={18} color={colors.success} /><T style={{ fontWeight: '800', marginLeft: 8 }}>About diamonds</T></Row>
        <Dim>MatchUp uses virtual diamonds for fun. Diamonds have no cash value and cannot be bought, sold, withdrawn or exchanged for prizes.</Dim>
      </Card>

      <PressScale scaleTo={0.98} style={{ marginTop: 22, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger + '66', backgroundColor: colors.danger + '14', padding: 14 }}
        onPress={() => Alert.alert('Log out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])}>
        <Row style={{ justifyContent: 'center' }}><LogOutIcon /><Text style={{ color: colors.danger, fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Log out</Text></Row>
      </PressScale>

      <SectionHeader title="Legal and account" />
      <MenuRow icon={<ShieldIcon size={20} color={colors.primarySoft} />} label="Privacy policy" onPress={() => Linking.openURL(`${ORIGIN}/privacy`)} />
      <MenuRow icon={<ShieldIcon size={20} color={colors.primarySoft} />} label="Terms of use" onPress={() => Linking.openURL(`${ORIGIN}/terms`)} />
      <MenuRow icon={<LogOutIcon size={20} color={colors.danger} />} label="Delete account" hint="Permanently erase your account and data" onPress={() => navigation.navigate('DeleteAccount')} />
    </Screen>
  );
}
