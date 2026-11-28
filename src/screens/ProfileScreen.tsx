import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { ORIGIN, POLL_MS } from '../config';
import { unregisterPush } from '../push';
import { useAuth } from '../store';
import { Button, Card, Dim, NameField, PressScale, Row, Screen, SectionHeader, T, TeamAvatar, VerifiedPill } from '../ui';
import { AlertIcon, BellIcon, ChevronRightIcon, DiamondIcon, HistoryIcon, ShieldIcon, TrophyIcon } from '../icons';
import { colors, radius } from '../theme';
import type { User } from '../types';
import { AccountSheet, AccountSheets } from '../components/AccountSheets';
import { PlayerIdCard } from '../components/PlayerIdCard';
import { LegalSheet, LegalSlug } from '../components/LegalSheet';
import { ReportProblemSheet } from '../components/ReportProblemSheet';
import { showAlert } from '../dialog';
import { useFocusEffect } from '@react-navigation/native';

function MenuRow({ icon, label, value, onPress, danger }: { icon: React.ReactNode; label: string; value?: string; onPress: () => void; danger?: boolean }) {
  // a long value is a hint: it goes under the label, so the label never wraps (same as the website)
  const hint = !!value && value.length > 18;
  return (
    <PressScale onPress={onPress} scaleTo={0.985} style={{ paddingVertical: 13, paddingHorizontal: 14 }}>
      <Row>
        <View style={{ width: 32, alignItems: 'center', marginRight: 10 }}>{icon}</View>
        {hint ? (
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '600', color: danger ? colors.danger : colors.text }}>{label}</T>
            <Dim style={{ fontSize: 13, marginTop: 2 }}>{value}</Dim>
          </View>
        ) : (
          <T style={{ flex: 1, fontWeight: '600', color: danger ? colors.danger : colors.text }}>{label}</T>
        )}
        {value && !hint ? <Dim style={{ marginRight: 6, maxWidth: '58%' }} numberOfLines={1}>{value}</Dim> : null}
        <ChevronRightIcon />
      </Row>
    </PressScale>
  );
}

/** A grouped list: rows share one card with thin dividers, so the page stays short and scannable. */
/** A row that only shows information (not tappable), with an optional small button on the right. */
function InfoRow({ icon, label, value, action, onAction }: { icon: React.ReactNode; label: string; value: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 32, alignItems: 'center', marginRight: 10 }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={{ fontWeight: '600' }}>{label}</T>
        <Dim style={{ fontSize: 13, marginTop: 2 }} numberOfLines={1}>{value}</Dim>
      </View>
      {action && onAction ? (
        <PressScale onPress={onAction} accessibilityLabel={`${action} ${label.toLowerCase()}`} hitSlop={6}
          style={{ marginLeft: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary + '66', backgroundColor: colors.primary + '1F', paddingHorizontal: 14, paddingVertical: 7 }}>
          <Text style={{ color: colors.primarySoft, fontWeight: '800', fontSize: 13.5 }}>{action}</Text>
        </PressScale>
      ) : null}
    </View>
  );
}

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
  const [sheet, setSheet] = useState<AccountSheet>(null);
  const [legal, setLegal] = useState<LegalSlug | null>(null);
  const [report, setReport] = useState(false);   // Report a problem sheet
  // Keep the badge fresh: an owner may have verified this account since the app last loaded it.
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<User>('/me'), refetchInterval: POLL_MS });
  // fresh on every visit: the owner may have changed things (verification, Refer & earn) since
  useFocusEffect(React.useCallback(() => { me.refetch(); }, []));
  useEffect(() => { if (me.data && (me.data.kyc_status !== user.kyc_status || me.data.can_predict !== user.can_predict || me.data.phone_verified !== user.phone_verified
    || me.data.mobile_required !== user.mobile_required || me.data.mobile_verified !== user.mobile_verified || me.data.email !== user.email || me.data.pending_email !== user.pending_email || me.data.referral_enabled !== user.referral_enabled)) setUser(me.data); }, [me.data]);

  const save = async () => {
    setBusy(true);
    try { setUser(await api.put<User>('/me', { name: name.trim() })); setEditing(false); }
    catch (e) { showAlert('Could not save', errMsg(e)); } finally { setBusy(false); }
  };
  const logout = async () => {
    await unregisterPush();
    try { await api.post('/auth/logout'); } catch {}
    await signOut(); qc.clear();
  };
  const idDone = user.kyc_status === 'verified';
  const nextChange = user.name_change_at ? new Date(user.name_change_at) : null;   // display names change once a week
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
              <Text style={{ color: colors.warning, fontWeight: '800', fontSize: 12 }}>{idPending ? 'ID under review' : user.phone_verified ? (user.id_required !== false ? 'Not verified · add ID' : 'Waiting for club approval') : 'Not verified · tap to verify'}</Text>
            </PressScale>}
        </View>
      </Row>
      {/* the club owner finds this player by this ID when adding diamonds */}
      <PlayerIdCard id={user.player_id ?? user.id} />

      {!user.can_predict ? (
        <Card style={{ borderColor: colors.warning }}>
          <T style={{ fontWeight: '800', marginBottom: 10 }}>Finish verifying to start predicting</T>
          <Step done={user.phone_verified} label="Confirm your email or phone" />
          {user.mobile_required ? <Step done={!!user.mobile_verified} label="Verify your mobile number" hint={user.mobile_verified ? undefined : 'Account → Mobile number'} /> : null}
          {user.id_required !== false ? <Step done={idDone} label="Upload your ID" hint={idPending ? 'Waiting for a club owner to review it' : undefined} /> : <Step done={false} label="Get verified by your club owner" hint="No ID needed for your clubs" />}
          <Button title={user.phone_verified ? (user.id_required !== false ? 'Upload ID' : 'Review status') : 'Verify now'} onPress={() => navigation.navigate('Verify')} small style={{ marginTop: 6 }} />
        </Card>
      ) : null}

      <SectionHeader title="My activity" />
      <Group>
        {user.referral_enabled ? <MenuRow icon={<DiamondIcon size={20} color={colors.success} />} label="Refer & earn" onPress={() => navigation.navigate('Referral')} /> : null}
        <MenuRow icon={<BellIcon size={20} color={colors.primarySoft} />} label="Notifications" onPress={() => navigation.navigate('Alerts')} />
        <MenuRow icon={<DiamondIcon size={20} color={colors.primarySoft} />} label="My diamonds" onPress={() => navigation.navigate('Diamonds')} />
        <MenuRow icon={<HistoryIcon size={20} color={colors.primarySoft} />} label="Prediction history" onPress={() => navigation.navigate('History')} />
      </Group>

      <SectionHeader title="Account" />
      {editing ? (
        <Card>
          <NameField value={name} onChangeText={setName} autoFocus />
          <Dim style={{ marginBottom: 10, fontSize: 12 }}>You can change your display name once a week.</Dim>
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1 }}><Button title="Cancel" kind="ghost" small onPress={() => { setName(user.name); setEditing(false); }} /></View>
            <View style={{ flex: 1 }}><Button title="Save" small onPress={save} loading={busy} disabled={name.trim().length < 2 || name.trim() === user.name} /></View>
          </Row>
        </Card>
      ) : (
        <Group>
          <MenuRow icon={<Text style={{ fontSize: 18 }}>✏️</Text>} label="Display name" value={user.name}
            onPress={() => (nextChange ? showAlert('Display name', `You can change your display name once a week. Next change: ${nextChange.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}.`) : setEditing(true))} />
          {/* the address itself is only information; changing it is the separate button */}
          <InfoRow icon={<Text style={{ fontSize: 18 }}>✉️</Text>} label="Email" value={user.pending_email ? `${user.email ?? ''} · new address waiting for its code` : (user.email ?? 'No email yet')}
            action={user.email ? 'Change' : 'Add'} onAction={() => setSheet('email')} />
          <MenuRow icon={<ShieldIcon size={20} color={colors.primarySoft} />} label="Password" value="Change" onPress={() => setSheet('password')} />
          {user.mobile_required || user.phone ? (
            <MenuRow icon={<Text style={{ fontSize: 18 }}>📱</Text>} label="Mobile number" value={user.phone ? `${user.phone}${user.mobile_verified ? ' ✓' : ' · verify'}` : 'Add and verify'} onPress={() => setSheet('mobile')} />
          ) : null}
          {user.is_owner ? <MenuRow icon={<TrophyIcon size={20} />} label="Owner plan" onPress={() => navigation.navigate('Subscription')} /> : null}
        </Group>
      )}
      {!editing && nextChange ? <Dim style={{ marginTop: 8 }}>Next display name change: {nextChange.toLocaleDateString([], { month: 'long', day: 'numeric' })}</Dim> : null}
      {user.is_owner ? <Dim style={{ marginTop: 8 }}>Manage matches, members and diamonds at {ORIGIN}/owner</Dim> : null}

      <SectionHeader title="Help" />
      <Group>
        <MenuRow icon={<AlertIcon size={20} color={colors.primarySoft} />} label="Report a problem" value="Bugs, matches, diamonds, account" onPress={() => setReport(true)} />
      </Group>

      <SectionHeader title="About" />
      <Group>
        <MenuRow icon={<ShieldIcon size={20} color={colors.primarySoft} />} label="Privacy policy" onPress={() => setLegal('privacy')} />
        <MenuRow icon={<ShieldIcon size={20} color={colors.primarySoft} />} label="Terms of use" onPress={() => setLegal('terms')} />
      </Group>
      <Dim style={{ marginTop: 10 }}>Diamonds are virtual, for fun only. They have no cash value and cannot be bought, sold or withdrawn.</Dim>

      <Button title="Log out" kind="ghost" style={{ marginTop: 22 }}
        onPress={() => showAlert('Log out?', 'You will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])} />
      <PressScale onPress={() => navigation.navigate('DeleteAccount')} style={{ marginTop: 14, paddingVertical: 8, alignItems: 'center' }}>
        <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete account</Text>
      </PressScale>
      <Dim style={{ textAlign: 'center', marginTop: 12, fontSize: 12 }}>PickArena {appVersion()}</Dim>
      <AccountSheets open={sheet} onClose={() => setSheet(null)} />
      <LegalSheet slug={legal} onClose={() => setLegal(null)} />
      <ReportProblemSheet open={report} onClose={() => setReport(false)} />
    </Screen>
  );
}

/** Release shown to people: app.json "1.2.0" → "v1.2" (releases go v1.0, v1.1, v1.2 …). */
export function appVersion(): string {
  const [major = '1', minor = '0'] = String(Constants.expoConfig?.version ?? '1.0.0').split('.');
  return `v${major}.${minor}`;
}
