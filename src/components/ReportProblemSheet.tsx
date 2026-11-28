import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Constants from 'expo-constants';
import { api, errMsg, fieldErrors } from '../api';
import { Button, Chip, Dim, Field, FieldError, when } from '../ui';
import { showAlert } from '../dialog';
import { colors, radius } from '../theme';
import { useClubContext } from '../club';

type Cat = { key: string; label: string };
type Issue = { id: number; subject: string; category_label: string; status: string; status_label: string; admin_note: string | null; created_at: string; has_screenshot?: boolean };
const FALLBACK: Cat[] = [{ key: 'bug', label: 'Something is broken' }, { key: 'other', label: 'Something else' }];
const STATUS: Record<string, [string, string]> = { open: ['Received', colors.amber], in_progress: ['Being looked at', colors.primary], resolved: ['Resolved', colors.success] };

/** Report a problem: goes to the admin's Reported issues. Shows your recent reports and their status (same as the website). */
export function ReportProblemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { active } = useClubContext();
  const [cats, setCats] = useState<Cat[]>(FALLBACK);
  const [cat, setCat] = useState('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [err, setErr] = useState<{ subject?: string | null; message?: string | null }>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [mine, setMine] = useState<Issue[]>([]);
  const [shot, setShot] = useState<{ uri: string } | null>(null);   // optional screenshot of the problem

  useEffect(() => {
    if (!open) return;
    setSent(false); setErr({});
    api.get<Cat[]>('/issues/categories').then(setCats).catch(() => {});
    api.get<Issue[]>('/issues').then(setMine).catch(() => {});
  }, [open]);

  /** Pick a screenshot from the phone's photos; it is made smaller before it is sent. */
  const pickShot = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return showAlert('Permission needed', 'Allow photo access to add a screenshot.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (r.canceled) return;
    const a = r.assets[0];
    try {
      const big = Math.max(a.width, a.height) > 2000;
      const out = await ImageManipulator.manipulateAsync(a.uri, big ? [{ resize: a.width >= a.height ? { width: 2000 } : { height: 2000 } }] : [], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG });
      setShot({ uri: out.uri });
    } catch { setShot({ uri: a.uri }); }
  };

  const submit = async () => {
    if (busy) return;
    const e: typeof err = {};
    if (subject.trim().length < 3) e.subject = 'Give it a short title (at least 3 characters).';
    if (message.trim().length < 10) e.message = 'Tell us a little more (at least 10 characters) so we can find the problem.';
    setErr(e);
    if (e.subject || e.message) return;
    setBusy(true);
    try {
      const body = { category: cat, subject: subject.trim(), message: message.trim(), source: 'app', club_id: active?.id ?? null,
        context: { platform: Platform.OS, os_version: String(Platform.Version), app_version: Constants.expoConfig?.version ?? '' } };
      if (shot) {   // with a picture the report goes as a form upload
        const f = new FormData();
        f.append('category', body.category); f.append('subject', body.subject); f.append('message', body.message); f.append('source', body.source);
        if (body.club_id) f.append('club_id', String(body.club_id));
        Object.entries(body.context).forEach(([k, v]) => f.append(`context[${k}]`, v));
        f.append('screenshot', { uri: shot.uri, name: 'screenshot.jpg', type: 'image/jpeg' } as any);
        await api.upload('/issues', f);
      } else await api.post('/issues', body);
      setSent(true); setSubject(''); setMessage(''); setCat('bug'); setShot(null);
    } catch (x) {
      const f = fieldErrors(x);
      if (f.subject || f.message) setErr({ subject: f.subject, message: f.message }); else setErr({ message: errMsg(x) });
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ maxHeight: '92%', backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.line }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 34 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 14 }} />
            {sent ? (
              <View style={{ alignItems: 'center', paddingTop: 6 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success + '26', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.success, fontSize: 26, fontWeight: '900' }}>✓</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 12 }}>Thanks, we got your report</Text>
                <Dim style={{ textAlign: 'center', marginTop: 6, lineHeight: 20 }}>The PickArena team will look into it. You'll get a notification when it's resolved.</Dim>
                <Button title="Done" style={{ marginTop: 18, alignSelf: 'stretch' }} onPress={onClose} />
              </View>
            ) : (
              <>
                <Text style={{ color: colors.text, fontSize: 21, fontWeight: '800' }}>Report a problem</Text>
                <Dim style={{ marginTop: 4, marginBottom: 14 }}>Tell the PickArena team about a bug or a problem. We read every report.</Dim>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 8 }}>What is it about?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {cats.map((c) => <Chip key={c.key} label={c.label} active={cat === c.key} onPress={() => setCat(c.key)} style={{ marginRight: 0 }} />)}
                </View>
                <Field label="Short title" value={subject} onChangeText={(v) => { setSubject(v); setErr({ ...err, subject: null }); }} maxLength={150} placeholder="e.g. Matches page stays empty" error={err.subject} />
                <Text style={{ color: err.message ? colors.danger : colors.dim, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>What happened?</Text>
                <TextInput value={message} onChangeText={(v) => { setMessage(v); setErr({ ...err, message: null }); }} multiline maxLength={4000} textAlignVertical="top"
                  placeholder="What did you do, what did you expect, and what happened instead?" placeholderTextColor={colors.dim} accessibilityLabel="What happened?"
                  style={{ minHeight: 120, color: colors.text, fontSize: 15, backgroundColor: err.message ? colors.danger + '0F' : colors.bg2, borderWidth: 1, borderColor: err.message ? colors.danger : colors.line, borderRadius: radius.md, padding: 12 }} />
                <FieldError text={err.message} />
                {shot ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
                    <Image source={{ uri: shot.uri }} style={{ width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: colors.line }} accessibilityLabel="Your screenshot" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>Screenshot added</Text>
                      <Dim style={{ fontSize: 13 }}>It is sent with your report.</Dim>
                    </View>
                    <Pressable onPress={() => setShot(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remove screenshot">
                      <Text style={{ color: colors.primarySoft, fontWeight: '700' }}>Remove</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={pickShot} accessibilityRole="button" accessibilityLabel="Add a screenshot (optional)"
                    style={{ marginTop: 12, minHeight: 48, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                    <Text style={{ color: colors.primarySoft, fontWeight: '700' }}>＋ Add a screenshot</Text>
                    <Text style={{ color: colors.dim, marginLeft: 6 }}>(optional)</Text>
                  </Pressable>
                )}
                <Button title="Send report" style={{ marginTop: 14 }} onPress={submit} loading={busy} />
                <Button title="Cancel" kind="ghost" style={{ marginTop: 8 }} onPress={onClose} />
                {mine.length ? (
                  <View style={{ marginTop: 18 }}>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 4 }}>Your reports</Text>
                    {mine.slice(0, 5).map((i, n) => {
                      const [label, col] = STATUS[i.status] ?? [i.status_label, colors.dim];
                      return (
                        <View key={i.id} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: n ? 1 : 0, borderTopColor: colors.line }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{i.subject}</Text>
                            <Dim style={{ fontSize: 12.5 }}>{i.category_label} · {when(i.created_at)}{i.has_screenshot ? ' · 📎 screenshot' : ''}</Dim>
                            {i.admin_note ? <Text style={{ color: colors.text, fontSize: 13, marginTop: 2 }}>💬 {i.admin_note}</Text> : null}
                          </View>
                          <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: col + '66', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
                            <Text style={{ color: col, fontWeight: '800', fontSize: 11.5 }}>{label}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
