import React, { useState } from 'react';
import { Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { useAuth } from '../store';
import { PhoneField } from '../components/PhoneField';
import { Country, detectCountry, splitE164, toE164 } from '../countries';
import { Badge, Button, Card, Chip, Dim, Field, H1, H2, Row, Screen, T, c } from '../ui';
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
  const pick = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return Alert.alert('Permission needed', 'Allow photo access to upload your ID.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
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

  return (
    <Screen>
      <Button title="‹ Back" kind="ghost" onPress={() => navigation.goBack()} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, marginBottom: 10 }} />
      <H1>Verify account</H1>
      <Row style={{ marginBottom: 6 }}><T>Status: </T><Badge text={user.can_predict ? 'verified' : user.kyc_status} /></Row>
      <Dim>Verify your email (or phone) and ID to make predictions.</Dim>

      <H2>1. Email or phone</H2>
      {user.phone_verified ? <Card><T style={{ color: c.good }}>✓ {user.phone ?? user.email} verified</T></Card> : (
        <>
          {user.email ? <Row style={{ marginBottom: 10 }}><Chip label="Email code" active={method === 'email'} onPress={() => { setMethod('email'); setSent(false); setCode(''); setDevCode(null); }} /><Chip label="SMS" active={method === 'phone'} onPress={() => { setMethod('phone'); setSent(false); setCode(''); setDevCode(null); }} /></Row> : null}
          {method === 'email' ? (
            <>
              <Dim style={{ marginBottom: 8 }}>We will email a 6-digit code to {user.email}.</Dim>
              {devCode ? <Card style={{ borderColor: c.warn }}><T>Dev mode: your code is <T style={{ fontWeight: '800' }}>{devCode}</T></T></Card> : null}
              {sent ? (<><Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} /><Button title="Verify email" onPress={verifyEmail} loading={busy} disabled={code.length !== 6} /></>)
                : <Button title="Email me a code" onPress={sendEmail} loading={busy} />}
            </>
          ) : (
            <>
          <PhoneField label="Mobile number" country={country} onCountry={setCountry} national={national} onNational={setNational} editable={!sent} />
          {devCode ? <Card style={{ borderColor: c.warn }}><T>Dev mode: your code is <T style={{ fontWeight: '800' }}>{devCode}</T></T></Card> : null}
          {sent ? (<><Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} /><Button title="Verify phone" onPress={verifyPhone} loading={busy} disabled={code.length !== 6} /></>)
            : <Button title="Send code" onPress={sendCode} loading={busy} disabled={national.replace(/\D/g, '').length < 6} />}
            </>
          )}
        </>
      )}

      <H2>2. ID document</H2>
      {user.kyc_status === 'verified' ? <Card><T style={{ color: c.good }}>✓ ID verified</T></Card>
        : user.kyc_status === 'pending' ? <Card><T>Your ID is waiting for review by a club owner.</T></Card>
        : !user.phone_verified ? <Dim>Verify your email or phone first.</Dim> : (
        <>
          {user.kyc_status === 'rejected' ? <Card style={{ borderColor: c.bad }}><T style={{ color: c.bad }}>Your last ID was rejected. Please upload a clearer photo.</T></Card> : null}
          <Field label="Full name (as on your ID)" value={name} onChangeText={setName} autoCapitalize="words" />
          {img ? <Image source={{ uri: img.uri }} style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 10 }} resizeMode="cover" /> : null}
          <Button title={img ? 'Change photo' : 'Choose ID photo'} kind="ghost" onPress={pick} style={{ marginBottom: 10 }} />
          <Button title="Submit for review" onPress={submit} loading={busy} disabled={!img || name.trim().length < 2} />
        </>
      )}
      <Button title="Refresh status" kind="ghost" style={{ marginTop: 18 }} onPress={() => run(reload)} />
    </Screen>
  );
}
