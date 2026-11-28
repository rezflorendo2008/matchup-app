import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button, Card, Dim, Field, Logo, NameField, Notice, PressScale, Screen, T, c } from '../ui';
import { SocialButtons } from '../components/SocialButtons';
import { PhoneField } from '../components/PhoneField';
import { Country, detectCountry, toE164 } from '../countries';
import { api, errMsg, fieldErrors } from '../api';
import { BASE } from '../config';
import { useAuth } from '../store';
import { readPending } from '../pending';
import { colors } from '../theme';
import type { User } from '../types';

type AuthRes = { token: string; user: User };
type Mode = 'email' | 'password' | 'phone';
const NAME_MSG = 'Please enter your display name.';

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} style={{ paddingVertical: 10, alignItems: 'center' }}>
      <Text style={{ color: colors.primarySoft, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </PressScale>
  );
}

/**
 * One screen, one main path: type your email, get a code, done. New players are asked for a
 * display name only after the server says the email is new, so returning players never see it.
 */
export default function LoginScreen() {
  const setAuth = useAuth((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>('email');
  const [smsOn, setSmsOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [needName, setNeedName] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string>>({});   // server errors for one box, shown under it
  const [errTone, setErrTone] = useState<'error' | 'warning'>('error');
  const clearFe = (k: string) => setFe((f) => (f[k] ? { ...f, [k]: '' } : f));
  const [refCode, setRefCode] = useState('');
  const [invited, setInvited] = useState(false);

  // email code
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [dev, setDev] = useState<string | null>(null);

  // phone code
  const [country, setCountry] = useState<Country>(() => detectCountry());
  const [national, setNational] = useState('');
  const phone = national.trim() ? toE164(country, national) : '';

  // password
  const [register, setRegister] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => { readPending().then((p) => { if (p) { setInvited(true); if (p.ref) setRefCode(p.ref); } }); }, []);
  useEffect(() => {
    api.get<{ sms: boolean; country?: string | null }>('/auth/methods')
      .then((m) => { setSmsOn(!!m.sms); if (m.country) setCountry(detectCountry(m.country)); }).catch(() => {});
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setErr(null); setFe({}); setBusy(true);
    try { await fn(); } catch (e) {
      const msg = errMsg(e);
      if (msg === NAME_MSG) { setNeedName(true); setErr(null); }   // new account: one more step, not an error
      else { setFe(fieldErrors(e)); setErr(msg); setErrTone((e as any)?.status === 429 ? 'warning' : 'error'); }
    } finally { setBusy(false); }
  };
  const back = (m: Mode) => { setMode(m); setErr(null); setFe({}); setInfo(null); setSent(false); setCode(''); setDev(null); setNeedName(false); };
  // what the server checks for a new password: 8+ characters, a letter and a number
  const pwRules: [boolean, string][] = [[password.length >= 8, '8+ characters'], [/[A-Za-z]/.test(password), 'a letter'], [/\d/.test(password), 'a number']];
  const pwOk = pwRules.every((r) => r[0]);

  const sendCode = () => run(async () => {
    const path = mode === 'phone' ? '/auth/otp/send' : '/auth/email-otp/send';
    const r = await api.post<{ sent: boolean; dev_code?: string }>(path, mode === 'phone' ? { phone } : { email: email.trim() });
    setSent(true);
    if (r.dev_code) { setDev(r.dev_code); setCode(r.dev_code); }
  });
  const verify = () => run(async () => {
    const path = mode === 'phone' ? '/auth/otp/verify' : '/auth/email-otp/verify';
    const extra = { name: name.trim() || undefined, ref: refCode.trim() || undefined };
    const body = mode === 'phone' ? { phone, code: code.trim(), ...extra } : { email: email.trim(), code: code.trim(), ...extra };
    const r = await api.post<AuthRes>(path, body);
    await setAuth(r.token, r.user);
  });
  const passwordGo = () => run(async () => {
    const body = register ? { name: name.trim(), email: email.trim(), password, ref: refCode.trim() || undefined } : { email: email.trim(), password };
    const r = await api.post<AuthRes>(register ? '/auth/register' : '/auth/login', body);
    await setAuth(r.token, r.user);
  });

  const target = mode === 'phone' ? phone : email.trim();
  const title = mode === 'password' ? (register ? 'Create your account' : 'Log in') : needName ? 'Choose your display name' : sent ? 'Check your ' + (mode === 'phone' ? 'messages' : 'email') : 'Sign in or create account';
  const sub = mode === 'password' ? 'Use your email and password.'
    : needName ? 'Last step: this is the name other players will see. You can change it later.'
    : sent ? `We sent a 6-digit code to ${target}. It expires in 5 minutes.`
    : mode === 'phone' ? 'We will text you a 6-digit code.' : 'We will email you a 6-digit code. No password needed.';

  return (
    <Screen hideBar>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ marginTop: 28, marginBottom: 22, alignItems: 'flex-start' }}>
          <Logo size={34} />
          <Text style={{ color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4, marginTop: 22 }}>{title}</Text>
          <Dim style={{ marginTop: 6, fontSize: 15 }}>{sub}</Dim>
        </View>

        {invited ? <Notice tone="success" style={{ marginTop: 0, marginBottom: 14 }}><T style={{ fontWeight: '700' }}>You were invited to a club 🎉</T><Dim style={{ marginTop: 2 }}>Sign in or create your account and we will send your join request.{refCode ? ` Referral code ${refCode} applied.` : ''}</Dim></Notice> : null}

        {mode === 'password' ? (
          <>
            {register ? <NameField value={name} onChangeText={(v) => { setName(v); clearFe('name'); }} error={fe.name} /> : null}
            {register ? <Field label="Referral code (optional)" value={refCode} onChangeText={(v) => setRefCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} placeholder="From a friend" /> : null}
            <Field label="Email" value={email} onChangeText={(v) => { setEmail(v); clearFe('email'); }} keyboardType="email-address" autoComplete="email" autoCapitalize="none" error={fe.email} />
            <Field label={register ? 'Password (at least 8 characters)' : 'Password'} value={password} onChangeText={(v) => { setPassword(v); clearFe('password'); }} error={fe.password} secureTextEntry autoComplete={register ? 'new-password' : 'current-password'} />
            {register ? <Dim style={{ marginTop: -4, marginBottom: 12, color: pwOk ? c.good : c.dim }}>{pwOk ? '✓ Good password' : pwRules.map(([ok, label]) => (ok ? '✓ ' : '') + label).join(' · ')}</Dim> : null}
            <Button title={register ? 'Create account' : 'Log in'} onPress={passwordGo} loading={busy}
              disabled={!email.includes('@') || (register ? !pwOk : password.length < 1) || (register && name.trim().length < 2)} />
            {!register ? <TextLink label="Forgot your password?" onPress={() => { back('email'); setInfo('No problem: sign in with a code we email you. Then set a new password in Account → Password.'); }} /> : null}
            <TextLink label={register ? 'I already have an account' : 'Create an account with a password'} onPress={() => { setRegister(!register); setErr(null); }} />
            <TextLink label="Use an email code instead" onPress={() => back('email')} />
          </>
        ) : !sent ? (
          <>
            {mode === 'phone'
              ? <PhoneField label="Mobile number" country={country} onCountry={setCountry} national={national} onNational={(v) => { setNational(v); clearFe('phone'); }} error={fe.phone} />
              : <Field label="Email" value={email} onChangeText={(v) => { setEmail(v); clearFe('email'); }} keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoFocus error={fe.email} />}
            <Button title="Continue" onPress={sendCode} loading={busy}
              disabled={mode === 'phone' ? national.replace(/\D/g, '').length < 6 : !email.includes('@')} />
          </>
        ) : (
          <>
            {dev ? <Notice tone="warning" style={{ marginTop: 0, marginBottom: 12 }}><T>Test mode: your code is <T style={{ fontWeight: '800' }}>{dev}</T></T></Notice> : null}
            <Field label="6-digit code" value={code} onChangeText={(v) => { setCode(v); clearFe('code'); }} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" autoFocus={!needName} error={fe.code} />
            {needName ? <NameField value={name} onChangeText={(v) => { setName(v); clearFe('name'); }} placeholder="How friends will see you" autoFocus error={fe.name} /> : null}
            {needName ? <Field label="Referral code (optional)" value={refCode} onChangeText={(v) => setRefCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} placeholder="From a friend" /> : null}
            <Button title="Verify & continue" onPress={verify} loading={busy} disabled={code.trim().length !== 6 || (needName && name.trim().length < 2)} />
            <TextLink label="Send a new code" onPress={sendCode} />
            <TextLink label={mode === 'phone' ? 'Use a different number' : 'Use a different email'} onPress={() => back(mode)} />
          </>
        )}

        {info && mode === 'email' && !sent ? <Notice tone="info">{info}</Notice> : null}
        {err && !['email', 'password', 'name', 'code', 'phone'].some((k) => fe[k]) ? <Notice tone={errTone}>{err}</Notice> : null}

        {mode !== 'password' && !sent ? (
          <>
            <View style={{ marginTop: 18 }}>
              <SocialButtons onError={(e) => setErr(e ?? null)} />
            </View>
            <View style={{ marginTop: 8 }}>
              {mode === 'email' && smsOn ? <TextLink label="Use a mobile number" onPress={() => back('phone')} /> : null}
              {mode === 'phone' ? <TextLink label="Use email instead" onPress={() => back('email')} /> : null}
              <TextLink label="Use a password instead" onPress={() => back('password')} />
            </View>
          </>
        ) : null}

        <Dim style={{ textAlign: 'center', marginTop: 24, fontSize: 12 }}>PickArena uses virtual diamonds only. They have no cash value.</Dim>
        {__DEV__ ? <Dim style={{ textAlign: 'center', marginTop: 6, fontSize: 11 }}>Server: {BASE}</Dim> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}
