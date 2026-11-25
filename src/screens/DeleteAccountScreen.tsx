import React, { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { ORIGIN } from '../config';
import { unregisterPush } from '../push';
import { useAuth } from '../store';
import { Button, Card, CardSkeleton, Dim, ErrorBox, Field, Row, Screen, T } from '../ui';
import { colors, radius } from '../theme';

type Check = { blocked: string | null; needs_password: boolean; owns_clubs: number };

export default function DeleteAccountScreen({ navigation }: any) {
  const qc = useQueryClient();
  const signOut = useAuth((s) => s.signOut);
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const check = useQuery({ queryKey: ['delete-check'], queryFn: () => api.get<Check>('/me/delete-check'), gcTime: 0 });
  const d = check.data;
  const ready = !!d && !d.blocked && confirm === 'DELETE' && (!d.needs_password || password.length > 0);

  const run = async () => {
    setBusy(true);
    try {
      await unregisterPush();
      await api.post('/me/delete', { confirm, password: d?.needs_password ? password : undefined });
      await signOut(); qc.clear();
    } catch (e) { Alert.alert('Could not delete account', errMsg(e)); } finally { setBusy(false); }
  };
  const ask = () => Alert.alert('Delete your account?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete forever', style: 'destructive', onPress: run }]);

  const Item = ({ children }: { children: React.ReactNode }) => (
    <Row style={{ alignItems: 'flex-start', marginBottom: 6 }}><Text style={{ color: colors.dim, marginRight: 8 }}>•</Text><View style={{ flex: 1 }}><Dim>{children}</Dim></View></Row>
  );

  return (
    <Screen title="Delete account">
      <Card>
        <T style={{ fontWeight: '800', marginBottom: 8 }}>What happens</T>
        <Item>Your name, email, phone number, ID photo and sign-ins are erased.</Item>
        <Item>You are removed from every club and signed out on all devices.</Item>
        <Item>Your diamonds are lost. They have no cash value and cannot be recovered.</Item>
        <Item>Past predictions stay in club records without your name.</Item>
        {d && d.owns_clubs > 0 ? <Item>Your {d.owns_clubs === 1 ? 'club is' : `${d.owns_clubs} clubs are`} closed and members can no longer predict in it.</Item> : null}
      </Card>

      {check.isLoading ? <CardSkeleton rows={1} /> : check.error ? <ErrorBox error={check.error} onRetry={() => check.refetch()} /> : d?.blocked ? (
        <Card style={{ borderColor: colors.warning + '88' }}><T style={{ fontWeight: '800', color: colors.warning }}>You can't delete yet</T><Dim style={{ marginTop: 4 }}>{d.blocked}</Dim></Card>
      ) : (
        <Card>
          {d?.needs_password ? <Field label="Your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" /> : null}
          <Field label="Type DELETE to confirm" value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" />
          <Button title="Delete my account" kind="danger" onPress={ask} loading={busy} disabled={!ready} />
        </Card>
      )}
      <Text onPress={() => Linking.openURL(`${ORIGIN}/privacy`)} style={{ color: colors.primarySoft, textAlign: 'center', marginTop: 8, borderRadius: radius.md }}>Read our privacy policy</Text>
    </Screen>
  );
}
