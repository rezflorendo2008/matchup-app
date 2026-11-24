import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { COUNTRIES, Country, flag, toE164 } from '../countries';

/** Country picker (flag + dial code) next to the number box. The parent keeps `country` and `national` and builds the full number with toE164(). */
export function PhoneField({ label, country, onCountry, national, onNational, editable = true }: {
  label?: string; country: Country; onCountry: (c: Country) => void; national: string; onNational: (v: string) => void; editable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^\+/, '');
    return t ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(t) || c.dial.startsWith(t) || c.iso.toLowerCase() === t) : COUNTRIES;
  }, [q]);

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable disabled={!editable} onPress={() => { setQ(''); setOpen(true); }} accessibilityLabel={`Country code, ${country.name} plus ${country.dial}`}
          style={[s.box, { flexDirection: 'row', alignItems: 'center', opacity: editable ? 1 : 0.6 }]}>
          <Text style={{ fontSize: 20, marginRight: 6 }}>{flag(country.iso)}</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>+{country.dial}</Text>
          <Text style={{ color: colors.dim, marginLeft: 6 }}>▾</Text>
        </Pressable>
        <TextInput style={[s.box, { flex: 1, color: colors.text, fontSize: 16 }]} value={national} onChangeText={onNational} editable={editable}
          keyboardType="phone-pad" placeholder="917 123 4567" placeholderTextColor={colors.dim} autoComplete="tel-national" textContentType="telephoneNumber" />
      </View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
            <TextInput style={[s.box, { flex: 1, color: colors.text, fontSize: 16 }]} value={q} onChangeText={setQ} placeholder="Search country or code" placeholderTextColor={colors.dim} autoFocus autoCorrect={false} />
            <Pressable onPress={() => setOpen(false)} style={{ paddingLeft: 14 }}><Text style={{ color: colors.primarySoft, fontSize: 16, fontWeight: '600' }}>Close</Text></Pressable>
          </View>
          <FlatList data={list} keyExtractor={(c) => c.iso} keyboardShouldPersistTaps="handled" initialNumToRender={20}
            renderItem={({ item }) => (
              <Pressable onPress={() => { onCountry(item); setOpen(false); }} style={[s.row, item.iso === country.iso && { backgroundColor: colors.card }]}>
                <Text style={{ fontSize: 22, width: 36 }}>{flag(item.iso)}</Text>
                <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{item.name}</Text>
                <Text style={{ color: colors.dim, fontSize: 16 }}>+{item.dial}</Text>
              </Pressable>
            )} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export { toE164 };

const s = StyleSheet.create({
  label: { color: colors.dim, fontSize: font.size.sm, fontWeight: '600', marginBottom: 6 },
  box: { backgroundColor: colors.bg2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
