import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../api';
import { Button, ClubAvatar, Dim, Field, FieldError, pts } from '../ui';
import { colors, radius } from '../theme';
import { useClubContext } from '../club';

const QUICK = [100, 250, 500, 1000];
const MAX_PENDING = 3;
type Req = { id: number; amount: number; status: string; created_at: string };

/**
 * "Request diamonds" popup (same as the website).
 * clubId given (club page, prediction slip): that club, fixed.
 * No clubId and 2+ clubs (My diamonds): the player must pick the club first; nothing is pre-selected.
 */
export function RequestDiamondsSheet({ clubId, onClose, onSent }: { clubId?: number | null; onClose: () => void; onSent?: (clubId: number) => void }) {
  const qc = useQueryClient();
  const { approved } = useClubContext();
  const fixed = clubId != null ? approved.find((c) => c.id === clubId) ?? null : approved.length === 1 ? approved[0] : null;
  const [selId, setSelId] = useState<number | null>(fixed?.id ?? null);
  const sel = approved.find((c) => c.id === selId) ?? null;
  const [amount, setAmount] = useState('');
  const [clubErr, setClubErr] = useState<string | null>(null);
  const [amtErr, setAmtErr] = useState<string | null>(null);
  const [pending, setPending] = useState<Req[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<number | null>(null);

  const loadPending = (id: number | null) => {
    setPending([]);
    if (!id) return;
    api.get<Req[]>(`/clubs/${id}/requests`).then((r) => setPending(r.filter((x) => x.status === 'pending'))).catch(() => {});
  };
  useEffect(() => { loadPending(selId); }, [selId]);
  const full = pending.length >= MAX_PENDING;

  const submit = async () => {
    if (busy) return;
    const n = Number(amount);
    let bad = false;
    if (!sel) { setClubErr('Choose the club you are asking for diamonds.'); bad = true; }
    if (!(n >= 1)) { setAmtErr('Enter how many diamonds you need (1 or more).'); bad = true; }
    else if (n > 100000) { setAmtErr('You can ask for up to 100,000 at a time.'); bad = true; }
    if (bad || full || !sel) return;
    setBusy(true);
    try {
      await api.post(`/clubs/${sel.id}/diamonds/request`, { amount: n });
      ['tx', 'clubs'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setSent(n);
      onSent?.(sel.id);
    } catch (e) {
      const msg = errMsg(e);
      if (/pending/i.test(msg)) loadPending(sel.id); else setAmtErr(msg);
    } finally { setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ maxHeight: '92%', backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderColor: colors.line }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 34 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 14 }} />
            {sent != null && sel ? (
              // done: same sheet, success state
              <View style={{ alignItems: 'center', paddingTop: 6 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.success + '26', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.success, fontSize: 26, fontWeight: '900' }}>✓</Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 21, fontWeight: '800', marginTop: 12 }}>Request sent</Text>
                <Dim style={{ textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{sel.name} will see your request for {pts(sent)} 💎. You'll get a notification when the diamonds are added.</Dim>
                <Button title="Done" style={{ marginTop: 18, alignSelf: 'stretch' }} onPress={onClose} />
              </View>
            ) : (
              <>
                <Text style={{ color: colors.text, fontSize: 21, fontWeight: '800' }}>Request diamonds</Text>
                <Dim style={{ marginTop: 4, marginBottom: 14 }}>Your club owner or an agent adds them. Diamonds are virtual and free.</Dim>

                {fixed ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, marginBottom: 14 }}>
                    <ClubAvatar name={fixed.name} logo={fixed.logo} size={36} />
                    <View style={{ flex: 1 }}><Dim style={{ fontSize: 12 }}>Asking</Dim><Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{fixed.name}</Text></View>
                    <Dim style={{ fontSize: 12.5 }}>{pts(fixed.balance)} 💎 now</Dim>
                  </View>
                ) : (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 8 }}>1. Which club are you asking?</Text>
                    <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                      {approved.map((cl) => {
                        const on = cl.id === selId;
                        return (
                          <Pressable key={cl.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${cl.name}, ${pts(cl.balance)} diamonds now`}
                            onPress={() => { setSelId(cl.id); setClubErr(null); }}
                            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.md,
                              borderWidth: 1.5, borderColor: on ? colors.primary : colors.line, backgroundColor: on ? colors.primary + '1A' : colors.bg2, opacity: pressed ? 0.85 : 1 })}>
                            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? colors.primary : colors.dim, alignItems: 'center', justifyContent: 'center' }}>
                              {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
                            </View>
                            <ClubAvatar name={cl.name} logo={cl.logo} size={32} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{cl.name}</Text>
                              <Dim style={{ fontSize: 12 }}>{pts(cl.balance)} 💎 now</Dim>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                    <FieldError text={clubErr} />
                  </View>
                )}

                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 2 }}>{fixed ? 'How many?' : '2. How many?'}</Text>
                <Field value={amount} onChangeText={(v) => { setAmount(v.replace(/\D/g, '').slice(0, 6)); setAmtErr(null); }} keyboardType="number-pad" placeholder="e.g. 500"
                  accessibilityLabel="How many diamonds" error={amtErr} style={{ fontSize: 22, fontWeight: '800' }} returnKeyType="send" onSubmitEditing={submit} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {QUICK.map((v) => {
                    const on = amount === String(v);
                    return (
                      <Pressable key={v} onPress={() => { setAmount(String(v)); setAmtErr(null); }} accessibilityRole="button" accessibilityLabel={`${v} diamonds`}
                        style={{ flex: 1, minHeight: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
                          borderColor: on ? colors.primary : colors.line, backgroundColor: on ? colors.primary + '1A' : colors.bg2 }}>
                        <Text style={{ color: on ? colors.primarySoft : colors.text, fontWeight: '800', fontSize: 14 }}>{pts(v)}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {sel && pending.length ? (
                  <View style={{ marginTop: 12, borderWidth: 1, borderColor: (full ? colors.danger : colors.amber) + '66', backgroundColor: (full ? colors.danger : colors.amber) + '14', borderRadius: radius.md, padding: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13.5 }}>{full ? `You already have ${MAX_PENDING} requests waiting` : `${pending.length} request${pending.length === 1 ? '' : 's'} waiting`}</Text>
                    <Dim style={{ fontSize: 13 }}>{full ? `${sel.name} needs to answer one before you can ask again.` : pending.map((r) => `${pts(r.amount)} 💎`).join(' · ')}</Dim>
                  </View>
                ) : null}

                <Button title="Send request" style={{ marginTop: 14 }} onPress={submit} loading={busy} disabled={full} />
                <Button title="Cancel" kind="ghost" style={{ marginTop: 8 }} onPress={onClose} />
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
