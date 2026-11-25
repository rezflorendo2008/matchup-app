import React, { useEffect, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { ORIGIN, POLL_MS } from '../config';
import { unregisterPush } from '../push';
import { useAuth } from '../store';
import { Button, Card, Dim, Field, PressScale, Row, Screen, SectionHeader, T, TeamAvatar, VerifiedPill } from '../ui';
import { BellIcon, ChevronRightIcon, DiamondIcon, HistoryIcon, ShieldIcon, TrophyIcon } from '../icons';
import { colors, radius } from '../theme';
import type { User } from '../types';

function MenuRow({ icon, label, value, onPress, danger }: { icon: React.ReactNode; label: string; value?: string; onPress: () => void; danger?: boolean }) {
  return (
    <PressScale onPress={onPress} scaleTo={0.985} style={{ paddingVertical: 13, paddingHorizontal: 14 }}>
      <Row>
        <View style={{ width: 32, alignItems: 'center', marginRight: 10 }}>{icon}</View>
        <T style={{ flex: 1, fontWeight: '600', color: danger ? colors.danger : colors.text }}>{label}</T>
        {value ? <Dim style={{ marginRight: 6 }}>{value}</Dim> : null}
        <ChevronRightIcon />
      </Row>
    </PressScale>
  );
}

/** A grouped list: rows share one card with thin dividers, so the page stays short and scannable. */
function Group({ children }: { children: React.ReactNode[] | React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
      {items.map((it, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>{it}</View>
      ))}
    </View>
  );
}

function Step({ done, label, hint }: { done: boolean; label: string; hint?: string }) {
  return (
    <Row style={{ marginBottom: 8 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: done ? colors.success : colors.line, backgroundColor: done ? colors.success : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        {done ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontWeight: '600', color: done ? colors.dim : colors.text }}>{label}</T>
        {hint ? <Dim>{hint}</Dim> : null}
      </View>
    </Row>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const signOut = useAuth((s) => s.signOut);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  // Keep the badge fresh: an owner may have verified this account since the app last loaded it.
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<User>('/me'), refetchInterval: POLL_MS });
  useEffect(() => { if (me.data && (me.data.kyc_status !== user.kyc_status || me.data.can_predict !== user.can_predict || me.data.phone_verified !== user.phone_verified)) setUser(me.data); }, [me.data]);

  const save = async () => {
    setBusy(true);
    try { setUser(await api.put<User>('/me', { name: name.trim() })); setEditing(false); }
    catch (e) { Alert.alert('Could not save', errMsg(e)); } finally { setBusy(false); }
  };
  const logout = async () => {
    await unregisterPush();
    try { await api.post('/auth/logout'); } catch {}
    await signOut(); qc.clear();
  };
  const idDone = user.kyc_status === 'verified';
  const idPending = user.kyc_status === 'pending';

  return (
    <Screen>
      <Row style={{ paddingTop: 4, marginBottom: 16 }}>
        <TeamAvatar name={user.name} size={60} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20 }} numberOfLines={1}>{user.name}</Text>
          <Dim numberOfLines={1} style={{ marginBottom: 6 }}>{user.email ?? user.phone ?? 'No contact added'}</Dim>
          {user.can_predict ? <VerifiedPill />
            : <PressScale onPress={() => navigation.navigate('Verify')} style={{ alignSelf: 'flex-start', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.warning + '99', backgroundColor: colors.warning + '1A', paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: colors.warning, fontWeight: '800', fontSize: 12 }}>{idPending ? 'ID under review' : user.phone_verified ? 'Not verified · add ID' : 'Not verified · tap to verify'}</Text>
            </PressScale>}
        </View>
      </Row>

      {!user.can_predict ? (
        <Card style={{ borderColor: colors.warning }}>
          <T style={{ fontWeight: '800', marginBottom: 10 }}>Finish verifying to start predicting</T>
          <Step done={user.phone_verified} label="Confirm your email or phone" />
          <Step done={idDone} label="Upload your ID" hint={idPending ? 'Waiting for a club owner to review it' : undefined} />
          <Button title={user.phone_verified ? 'Upload ID' : 'Verify now'} onPress={() => navigation.navigate('Verify')} small style={{ marginTop: 6 }} />
        </Card>
      ) : null}

      <SectionHeader title="My activity" />
      <Group>
        <MenuRow icon={<BellIcon size={20} color={colors.primarySoft} />} label="Notifications" onPress={() => navigation.navigate('Notifications')} />
        <MenuRow icon={<DiamondIcon size={20} color={colors.primarySoft} />} label="My diamonds" onPress={() => navigation.navigate('Diamonds')} />
        <MenuRow icon={<HistoryIcon size={20} color={colors.primarySoft} />} label="Prediction history" onPress={() => navigation.navigate('History')} />
      </Group>

      <SectionHeader title="Account" />
      {editing ? (
        <Card>
          <Field label="Display name" value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1 }}><Button title="Cancel" kind="ghost" small onPress={() => { setName(user.name); setEditing(false); }} /></View>
            <View style={{ flex: 1 }}><Button title="Save" small onPress={save} loading={busy} disabled={name.trim().length < 2 || name.trim() === user.name} /></View>
          </Row>
        </Card>
      ) : (
        <Group>
          <MenuRow icon={<Text style={{ fontSize: 18 }}>✏️</Text>} label="Display name" value={user.name} onPress={() => setEditing(true)} />
          {user.is_owner ? <MenuRow icon={<TrophyIcon size={20} />} label="Owner plan" onPress={() => navigation.navigate('Subscription')} /> : null}
        </Group>
      )}
      {user.is_owner ? <Dim style={{ marginTop: 8 }}>Manage matches, members and diamonds at {ORIGIN}/owner</Dim> : null}

      <SectionHeader title="About" />
      <Group>
        <MenuRow icon={<ShieldIcon size={20} color={colors.primarySoft} />} label="Privacy policy" onPress={() => Linking.openURL(`${ORIGIN}/privacy`)} />
        <MenuRow icon={<ShieldIcon size={20} color={colors.primarySoft} />} label="Terms of use" onPress={() => Linking.openURL(`${ORIGIN}/terms`)} />
      </Group>
      <Dim style={{ marginTop: 10 }}>Diamonds are virtual, for fun only. They have no cash value and cannot be bought, sold or withdrawn.</Dim>

      <Button title="Log out" kind="ghost" style={{ marginTop: 22 }}
        onPress={() => Alert.alert('Log out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])} />
      <PressScale onPress={() => navigation.navigate('DeleteAccount')} style={{ marginTop: 14, paddingVertical: 8, alignItems: 'center' }}>
        <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete account</Text>
      </PressScale>
    </Screen>
  );
}
