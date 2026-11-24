import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Card, Chip, Dim, Field, H1, Row, Screen, T, c } from '../ui';
import { SocialButtons } from '../components/SocialButtons';
import { api, errMsg } from '../api';
import { BASE } from '../config';
import { useAuth } from '../store';
import type { User } from '../types';

type AuthRes = { token: string; user: User };

export default function LoginScreen() {
  const setAuth = useAuth((s) => s.setAuth);
  const [tab, setTab] = useState<'mobile' | 'email'>('mobile');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // mobile
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  // email
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const run = async (fn: () => Promise<void>) => {
    setErr(null); setBusy(true);
    try { await fn(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  const sendCode = () => run(async () => {
    const r = await api.post<{ sent: boolean; dev_code?: string }>('/auth/otp/send', { phone: phone.trim() });
    setSent(true);
    if (r.dev_code) { setDevCode(r.dev_code); setCode(r.dev_code); }
  });
  const verify = () => run(async () => {
    const r = await api.post<AuthRes>('/auth/otp/verify', { phone: phone.trim(), code: code.trim(), name: name.trim() || undefined });
    await setAuth(r.token, r.user);
  });
  const emailGo = () => run(async () => {
    const body = register ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password };
    const r = await api.post<AuthRes>(register ? '/auth/register' : '/auth/login', body);
    await setAuth(r.token, r.user);
  });

  return (
    <Screen hideBar>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ marginTop: 30, marginBottom: 20 }}>
          <H1>MatchUp</H1>
          <Dim>Sign in or create an account</Dim>
        </View>

        <Row style={{ marginBottom: 16 }}>
          <Chip label="Mobile" active={tab === 'mobile'} onPress={() => { setTab('mobile'); setErr(null); }} />
          <Chip label="Email" active={tab === 'email'} onPress={() => { setTab('email'); setErr(null); }} />
        </Row>

        {tab === 'mobile' ? (
          <>
            <Field label="Mobile number (with country code)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+15551234567" editable={!sent} />
            {!sent ? (
              <>
                <Field label="Your name (new accounts)" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Optional" />
                <Button title="Send code" onPress={sendCode} loading={busy} disabled={phone.trim().length < 8} />
              </>
            ) : (
              <>
                {devCode ? <Card style={{ borderColor: c.warn }}><T>Dev mode: your code is <T style={{ fontWeight: '800' }}>{devCode}</T></T><Dim>Shown only on a local backend. Real SMS needs Twilio.</Dim></Card> : null}
                <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
                <Button title="Verify & continue" onPress={verify} loading={busy} disabled={code.trim().length !== 6} />
                <Button title="Use a different number" kind="ghost" style={{ marginTop: 10 }} onPress={() => { setSent(false); setCode(''); setDevCode(null); setErr(null); }} />
              </>
            )}
          </>
        ) : (
          <>
            {register ? <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" /> : null}
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
            <Field label="Password (min 8 characters)" value={password} onChangeText={setPassword} secureTextEntry />
            <Button title={register ? 'Create account' : 'Log in'} onPress={emailGo} loading={busy}
              disabled={!email.includes('@') || password.length < (register ? 8 : 1) || (register && !name.trim())} />
            <Button title={register ? 'I already have an account' : 'Create a new account'} kind="ghost" style={{ marginTop: 10 }} onPress={() => { setRegister(!register); setErr(null); }} />
          </>
        )}

        {err ? <Card style={{ borderColor: c.bad, marginTop: 14 }}><T style={{ color: c.bad }}>{err}</T></Card> : null}

        <View style={{ marginTop: 22 }}>
          <Dim style={{ textAlign: 'center', marginBottom: 6 }}>or</Dim>
          <SocialButtons onError={(e) => setErr(e ?? null)} />
        </View>

        <Dim style={{ textAlign: 'center', marginTop: 28 }}>MatchUp uses virtual diamonds only. Diamonds have no cash value.</Dim>
        <Dim style={{ textAlign: 'center', marginTop: 10 }}>Server: {BASE}</Dim>
      </KeyboardAvoidingView>
    </Screen>
  );
}
