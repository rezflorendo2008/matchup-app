import React, { useState } from 'react';
import { Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { POLL_MS } from '../config';
import { useAuth } from '../store';
import { PhoneField } from '../components/PhoneField';
import { Country, detectCountry, splitE164, toE164 } from '../countries';
import { Button, Card, Chip, Dim, Field, Row, Screen, T, VerifiedPill, c } from '../ui';
import { View } from 'react-native';
import type { User } from '../types';

export default function VerifyScreen({ navigation }: any) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user)!;
  const setUser = useAuth((s) => s.setUser);
  const [method, setMethod] = useState<'email' | 'phone'>(user.email ? 'email' : 'phone');
  const init = splitE164(user.phone ?? '', detectCountry());
  const [country, setCountry] = useState<Country>(init.country);
  const [national, setNational] = useState(init.national);
  const phone = national.trim() ? toE164(country, national) : '';
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [name, setName] = useState(user.name);
  const [img, setImg] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { Alert.alert('Failed', errMsg(e)); } finally { setBusy(false); } };
  const reload = async () => { setUser(await api.get<User>('/me')); qc.invalidateQueries(); };

  const sendCode = () => run(async () => {
    const r = await api.post<{ dev_code?: string }>('/me/phone/otp', { phone });
    setSent(true); if (r.dev_code) { setDevCode(r.dev_code); setCode(r.dev_code); }
  });
  const sendEmail = () => run(async () => {
    const r = await api.post<{ dev_code?: string }>('/me/email/otp', {});
    setSent(true); if (r.dev_code) { setDevCode(r.dev_code); setCode(r.dev_code); }
  });
  const verifyEmail = () => run(async () => { setUser(await api.post<User>('/me/email/verify', { code: code.trim() })); setSent(false); });
  const verifyPhone = () => run(async () => { setUser(await api.post<User>('/me/phone/verify', { phone: phone.trim(), code: code.trim() })); setSent(false); });
  const pick = async (camera = false) => {
    const p = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return Alert.alert('Permission needed', camera ? 'Allow camera access to photograph your ID.' : 'Allow photo access to upload your ID.');
    const r = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled) return;
    // Phone photos are often 5-12 MB; shrink to ~1600px JPEG (about 300-600 KB) so the upload is fast and never hits server size limits.
    try {
      const a = r.assets[0];
      const out = await ImageManipulator.manipulateAsync(a.uri, a.width > 1600 ? [{ resize: { width: 1600 } }] : [], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      setImg({ ...a, uri: out.uri, width: out.width, height: out.height, fileName: 'id.jpg', mimeType: 'image/jpeg' });
    } catch { setImg(r.assets[0]); }
  };
  const submit = () => run(async () => {
    const f = new FormData();
    f.append('full_name', name.trim());
    f.append('id_document', { uri: img!.uri, name: img!.fileName ?? 'id.jpg', type: img!.mimeType ?? 'image/jpeg' } as any);
    setUser(await api.upload<User>('/me/verify', f));
    Alert.alert('Submitted', 'A club owner will review your ID.');
  });

  // Status refreshes by itself, so the player sees the result as soon as an owner reviews the ID.
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<User>('/me'), refetchInterval: POLL_MS });
  React.useEffect(() => { if (me.data && (me.data.kyc_status !== user.kyc_status || me.data.can_predict !== user.can_predict || me.data.phone_verified !== user.phone_verified)) setUser(me.data); }, [me.data]);

  const emailDone = user.phone_verified, idDone = user.kyc_status === 'verified', idPending = user.kyc_status === 'pending', idRejected = user.kyc_status === 'rejected';
  const needId = user.id_required !== false;   // clubs can switch ID checks off
  const steps = needId ? 2 : 1;
  const doneCount = (emailDone ? 1 : 0) + (needId && idDone ? 1 : 0);
  const StepHead = ({ n, done, title, sub }: { n: number; done: boolean; title: string; sub?: string }) => (
    <Row style={{ marginTop: 22, marginBottom: 10 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: done ? c.good : c.brand, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
        <T style={{ color: '#fff', fontWeight: '800' }}>{done ? '✓' : String(n)}</T>
      </View>
      <View style={{ flex: 1 }}><T style={{ fontWeight: '800', fontSize: 17 }}>{title}</T>{sub ? <Dim>{sub}</Dim> : null}</View>
    </Row>
  );

  return (
    <Screen title="Verify your account">
      {user.can_predict ? (
        <Card style={{ borderColor: c.good }}>
          <VerifiedPill />
          <T style={{ marginTop: 10, fontWeight: '700' }}>You are verified and can make predictions.</T>
          <Dim style={{ marginTop: 2 }}>Your badge shows on your profile.</Dim>
        </Card>
      ) : (
        <>
          <Dim>{needId ? 'Two quick steps so club owners know you are a real player. About 2 minutes.' : 'One quick step: confirm your email or phone. Your clubs do not ask for an ID.'}</Dim>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {Array.from({ length: steps }, (_, i) => i).map((i) => <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < doneCount ? c.good : c.line }} />)}
          </View>
          <Dim style={{ marginTop: 6 }}>{doneCount} of {steps} done{!needId && emailDone ? '. Waiting for your club owner to verify you as a member.' : ''}</Dim>
        </>
      )}

      <StepHead n={1} done={emailDone} title="Confirm email or phone" sub={emailDone ? `${user.phone ?? user.email} confirmed` : 'We send a 6-digit code'} />
      {emailDone ? null : (
        <>
          {user.email ? <Row style={{ marginBottom: 10 }}><Chip label="Email code" active={method === 'email'} onPress={() => { setMethod('email'); setSent(false); setCode(''); setDevCode(null); }} /><Chip label="SMS" active={method === 'phone'} onPress={() => { setMethod('phone'); setSent(false); setCode(''); setDevCode(null); }} /></Row> : null}
          {method === 'email' ? (
            <>
              <Dim style={{ marginBottom: 8 }}>We will email a 6-digit code to {user.email}.</Dim>
              {devCode ? <Card style={{ borderColor: c.warn }}><T>Test mode: your code is <T style={{ fontWeight: '800' }}>{devCode}</T></T></Card> : null}
              {sent ? (<><Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoFocus /><Button title="Confirm email" onPress={verifyEmail} loading={busy} disabled={code.length !== 6} /><Button title="Send a new code" kind="ghost" style={{ marginTop: 8 }} onPress={sendEmail} loading={busy} /></>)
                : <Button title="Email me a code" onPress={sendEmail} loading={busy} />}
            </>
          ) : (
            <>
              <PhoneField label="Mobile number" country={country} onCountry={setCountry} national={national} onNational={setNational} editable={!sent} />
              {devCode ? <Card style={{ borderColor: c.warn }}><T>Test mode: your code is <T style={{ fontWeight: '800' }}>{devCode}</T></T></Card> : null}
              {sent ? (<><Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoFocus /><Button title="Confirm phone" onPress={verifyPhone} loading={busy} disabled={code.length !== 6} /></>)
                : <Button title="Send code" onPress={sendCode} loading={busy} disabled={national.replace(/\D/g, '').length < 6} />}
            </>
          )}
        </>
      )}

      {needId ? (
        <>
      <StepHead n={2} done={idDone} title="Upload your ID" sub={idDone ? 'ID verified by your club owner' : idPending ? 'Waiting for review' : 'A club owner reviews it. Usually quick.'} />
      {idDone ? null : !emailDone ? <Dim>Finish step 1 first.</Dim>
        : idPending ? (
          <Card style={{ borderColor: c.warn }}>
            <T style={{ fontWeight: '700' }}>Your ID is being reviewed ⏳</T>
            <Dim style={{ marginTop: 4 }}>You will get a notification as soon as a club owner approves it. Not in a club yet? Join one so an owner can review you.</Dim>
          </Card>
        ) : (
          <>
            {idRejected ? <Card style={{ borderColor: c.bad }}><T style={{ color: c.bad, fontWeight: '700' }}>Your last ID was not accepted.</T><Dim style={{ marginTop: 2 }}>Take a new photo: all four corners visible, no glare, text readable.</Dim></Card> : null}
            <Field label="Full name (as on your ID)" value={name} onChangeText={setName} autoCapitalize="words" />
            {img ? <Image source={{ uri: img.uri }} style={{ width: '100%', height: 190, borderRadius: 12, marginBottom: 10 }} resizeMode="cover" /> : (
              <Card><Dim>Use a passport, driver's licence or national ID. Only club owners you join can see it, and it is deleted if you delete your account.</Dim></Card>
            )}
            <Row style={{ gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}><Button title="Take photo" kind="ghost" small onPress={() => pick(true)} /></View>
              <View style={{ flex: 1 }}><Button title={img ? 'Change photo' : 'Choose photo'} kind="ghost" small onPress={() => pick(false)} /></View>
            </Row>
            <Button title="Submit for review" onPress={submit} loading={busy} disabled={!img || name.trim().length < 2} />
          </>
        )}
        </>
      ) : null}
    </Screen>
  );
}
