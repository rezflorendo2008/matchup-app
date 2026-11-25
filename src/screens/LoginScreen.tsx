import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Button, Card, Chip, Dim, Field, H1, Row, Screen, T, c } from '../ui';
import { SocialButtons } from '../components/SocialButtons';
import { PhoneField } from '../components/PhoneField';
import { Country, detectCountry, toE164 } from '../countries';
import { api, errMsg } from '../api';
import { BASE } from '../config';
import { useAuth } from '../store';
import type { User } from '../types';

type AuthRes = { token: string; user: User };

export default function LoginScreen() {
  const setAuth = useAuth((s) => s.setAuth);
  const [tab, setTab] = useState<'code' | 'mobile' | 'email'>('code');
  const [smsOn, setSmsOn] = useState(false);
  useEffect(() => { api.get<{ email: boolean; sms: boolean; country?: string | null }>('/auth/methods').then((m) => { setSmsOn(!!m.sms); if (m.country) setCountry(detectCountry(m.country)); }).catch(() => {}); }, []);

  // email code
  const [ecEmail, setEcEmail] = useState('');
  const [ecCode, setEcCode] = useState('');
  const [ecSent, setEcSent] = useState(false);
  const [ecDev, setEcDev] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // mobile
  const [country, setCountry] = useState<Country>(() => detectCountry());
  const [national, setNational] = useState('');
  const phone = national.trim() ? toE164(country, national) : '';
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
    const r = await api.post<{ sent: boolean; dev_code?: string }>('/auth/otp/send', { phone });
    setSent(true);
    if (r.dev_code) { setDevCode(r.dev_code); setCode(r.dev_code); }
  });
  const verify = () => run(async () => {
    const r = await api.post<AuthRes>('/auth/otp/verify', { phone, code: code.trim(), name: name.trim() || undefined });
    await setAuth(r.token, r.user);
  });
  const sendEmailCode = () => run(async () => {
    const r = await api.post<{ sent: boolean; dev_code?: string }>('/auth/email-otp/send', { email: ecEmail.trim() });
    setEcSent(true);
    if (r.dev_code) { setEcDev(r.dev_code); setEcCode(r.dev_code); }
  });
  const verifyEmailCode = () => run(async () => {
    const r = await api.post<AuthRes>('/auth/email-otp/verify', { email: ecEmail.trim(), code: ecCode.trim(), name: name.trim() || undefined });
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
          <H1>PickArena</H1>
          <Dim>Sign in or create an account</Dim>
        </View>

        <Row style={{ marginBottom: 16 }}>
          <Chip label="Email code" active={tab === 'code'} onPress={() => { setTab('code'); setErr(null); }} />
          <Chip label="Password" active={tab === 'email'} onPress={() => { setTab('email'); setErr(null); }} />
          {smsOn ? <Chip label="Mobile" active={tab === 'mobile'} onPress={() => { setTab('mobile'); setErr(null); }} /> : null}
        </Row>

        {tab === 'code' ? (
          <>
            <Field label="Email" value={ecEmail} onChangeText={setEcEmail} keyboardType="email-address" autoComplete="email" autoCapitalize="none" editable={!ecSent} />
            {!ecSent ? (
              <>
                <Field label="Display name (required)" value={name} onChangeText={setName} autoCapitalize="words" placeholder="How friends will see you" maxLength={80} />
                <Button title="Email me a code" onPress={sendEmailCode} loading={busy} disabled={!ecEmail.includes('@') || name.trim().length < 2} />
              </>
            ) : (
              <>
                {ecDev ? <Card style={{ borderColor: c.warn }}><T>Dev mode: your code is <T style={{ fontWeight: '800' }}>{ecDev}</T></T><Dim>Shown only on a local backend without real email.</Dim></Card> : <Dim style={{ marginBottom: 8 }}>We sent a 6-digit code to {ecEmail.trim()}. It expires in 5 minutes.</Dim>}
                <Field label="6-digit code" value={ecCode} onChangeText={setEcCode} keyboardType="number-pad" maxLength={6} />
                <Button title="Verify & continue" onPress={verifyEmailCode} loading={busy} disabled={ecCode.trim().length !== 6} />
                <Button title="Resend code" kind="ghost" style={{ marginTop: 10 }} onPress={sendEmailCode} />
                <Button title="Use a different email" kind="ghost" style={{ marginTop: 6 }} onPress={() => { setEcSent(false); setEcCode(''); setEcDev(null); setErr(null); }} />
              </>
            )}
          </>
        ) : tab === 'mobile' ? (
          <>
            <PhoneField label="Mobile number" country={country} onCountry={setCountry} national={national} onNational={setNational} editable={!sent} />
            {!sent ? (
              <>
                <Field label="Display name (required)" value={name} onChangeText={setName} autoCapitalize="words" placeholder="How friends will see you" maxLength={80} />
                <Button title="Send code" onPress={sendCode} loading={busy} disabled={national.replace(/\D/g, '').length < 6 || name.trim().length < 2} />
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

        <Dim style={{ textAlign: 'center', marginTop: 28 }}>PickArena uses virtual diamonds only. Diamonds have no cash value.</Dim>
        <Dim style={{ textAlign: 'center', marginTop: 10 }}>Server: {BASE}</Dim>
      </KeyboardAvoidingView>
    </Screen>
  );
}
