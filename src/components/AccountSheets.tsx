import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { api, errMsg } from '../api';
import { useAuth } from '../store';
import { PhoneField } from './PhoneField';
import { Country, detectCountry, splitE164, toE164 } from '../countries';
import { Button, Dim, Field } from '../ui';
import { colors, radius } from '../theme';
import type { User } from '../types';

export type AccountSheet = 'email' | 'password' | 'mobile' | null;

/** Bottom sheet shell shared by the three account settings. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '92%', backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.line }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 34 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 16 }} />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>{title}</Text>
            {children}
            <Button title="Cancel" kind="ghost" style={{ marginTop: 10 }} onPress={onClose} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fillDev = (r: { dev_code?: string }, set: (v: string) => void) => { if (r?.dev_code) { set(r.dev_code); Alert.alert('Dev mode', `Code: ${r.dev_code}`); } };
const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 6);

/** Change email: code goes to the NEW address; the email changes only once that code is entered. */
function EmailSheet({ onClose }: { onClose: () => void }) {
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState(user.pending_email ?? '');
  const [step, setStep] = useState<1 | 2>(user.pending_email ? 2 : 1);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { Alert.alert('Email', errMsg(e)); } finally { setBusy(false); } };
  const send = () => run(async () => {
    const r = await api.post<{ email: string; dev_code?: string }>('/me/email/change', { email: email.trim() });
    setUser({ ...user, pending_email: r.email }); setEmail(r.email); fillDev(r, setCode); setStep(2);
  });
  const confirm = () => run(async () => {
    setUser(await api.post<User>('/me/email/change/confirm', { code })); onClose();
    Alert.alert('Email changed', 'We let your old address know.');
  });
  const restart = () => run(async () => { try { setUser(await api.del<User>('/me/email/change')); } catch {} setCode(''); setStep(1); });
  return (
    <Sheet title="Change email" onClose={onClose}>
      {step === 1 ? (
        <>
          <Dim style={{ marginBottom: 12 }}>{user.email ? `Now: ${user.email}. Your email changes only after you enter the code we send to the new address.` : 'We send a code to check the address is yours.'}</Dim>
          <Field label="New email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Button title="Send code to new email" onPress={send} loading={busy} disabled={!email.includes('@')} />
        </>
      ) : (
        <>
          <Dim style={{ marginBottom: 12 }}>We emailed a 6-digit code to {email}. It expires in 5 minutes.</Dim>
          <Field label="6-digit code" value={code} onChangeText={(v) => setCode(digits(v))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} />
          <Button title="Confirm new email" onPress={confirm} loading={busy} disabled={code.length !== 6} />
          <Button title="Use a different email" kind="ghost" style={{ marginTop: 10 }} onPress={restart} disabled={busy} />
        </>
      )}
    </Sheet>
  );
}

/** Change password: current password, or a code for accounts that never set one. */
function PasswordSheet({ onClose }: { onClose: () => void }) {
  const [useCode, setUseCode] = useState(false);
  const [current, setCurrent] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const sendCode = async () => {
    setBusy(true);
    try { const r = await api.post<{ to: string; dev_code?: string }>('/me/password/code'); setUseCode(true); fillDev(r, setCode); if (!r.dev_code) Alert.alert('Code sent', `We sent a code to ${r.to}.`); }
    catch (e) { Alert.alert('Password', errMsg(e)); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true);
    try {
      await api.post('/me/password', { password: pw, password_confirmation: pw2, ...(useCode ? { code } : { current_password: current }) });
      onClose(); Alert.alert('Password changed', 'Your other devices were signed out.');
    } catch (e) { Alert.alert('Password', errMsg(e)); } finally { setBusy(false); }
  };
  const ready = pw.length >= 8 && pw2.length >= 8 && (useCode ? code.length === 6 : current.length > 0);
  return (
    <Sheet title="Change password" onClose={onClose}>
      {useCode
        ? <Field label="6-digit code" value={code} onChangeText={(v) => setCode(digits(v))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} />
        : <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" textContentType="password" />}
      <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Field label="New password again" value={pw2} onChangeText={setPw2} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Dim style={{ marginBottom: 12, fontSize: 12.5 }}>At least 8 characters, with letters and numbers.</Dim>
      <Button title="Change password" onPress={save} loading={busy} disabled={!ready} />
      {!useCode ? (
        <>
          <Button title="Send me a code instead" kind="ghost" style={{ marginTop: 10 }} onPress={sendCode} disabled={busy} />
          <Dim style={{ marginTop: 8, fontSize: 12.5 }}>Signed up with a code or Google/Facebook and never set a password? Use "Send me a code instead".</Dim>
        </>
      ) : null}
    </Sheet>
  );
}

/** Add or change the mobile number with an SMS code. */
function MobileSheet({ onClose }: { onClose: () => void }) {
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const init = splitE164(user.phone ?? '', detectCountry());
  const [country, setCountry] = useState<Country>(init.country);
  const [national, setNational] = useState(init.national);
  const phone = national.trim() ? toE164(country, national) : '';
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { const r = await api.post<{ dev_code?: string }>('/me/phone/otp', { phone }); setSent(true); fillDev(r, setCode); }
    catch (e) { Alert.alert('Mobile number', errMsg(e)); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true);
    try { setUser(await api.post<User>('/me/phone/verify', { phone, code })); onClose(); Alert.alert('Mobile number verified'); }
    catch (e) { Alert.alert('Mobile number', errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet title={user.phone ? 'Change mobile number' : 'Verify mobile number'} onClose={onClose}>
      <Dim style={{ marginBottom: 12 }}>{user.mobile_required ? 'PickArena asks every player to verify a mobile number before predicting.' : 'Add a mobile number to your account.'}</Dim>
      <PhoneField label="Mobile number" country={country} onCountry={setCountry} national={national} onNational={(v) => { setNational(v); setSent(false); }} editable={!busy} />
      {sent ? (
        <>
          <Field label="6-digit code" value={code} onChangeText={(v) => setCode(digits(v))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} />
          <Button title="Verify mobile number" onPress={verify} loading={busy} disabled={code.length !== 6} />
          <Button title="Send a new code" kind="ghost" style={{ marginTop: 10 }} onPress={send} disabled={busy} />
        </>
      ) : <Button title="Send code by SMS" onPress={send} loading={busy} disabled={!phone} />}
    </Sheet>
  );
}

export function AccountSheets({ open, onClose }: { open: AccountSheet; onClose: () => void }) {
  if (open === 'email') return <EmailSheet onClose={onClose} />;
  if (open === 'password') return <PasswordSheet onClose={onClose} />;
  if (open === 'mobile') return <MobileSheet onClose={onClose} />;
  return null;
}
