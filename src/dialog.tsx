import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { colors, radius } from './theme';

/**
 * PickArena's own alerts, in place of the plain system pop-ups. Same call as React Native's Alert.alert:
 *   showAlert('Leave club?', 'Your diamonds stay…', [{ text: 'Cancel', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress }])
 * Questions and errors open a themed dialog (coloured icon, title, message, full-width buttons, main action first).
 * A plain success message with nothing to decide shows as a short toast with a ✓ instead (same as the website).
 */
export type AlertButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
export type Tone = 'info' | 'success' | 'warning' | 'danger';
type DialogState = { title: string; message?: string; buttons: AlertButton[]; tone: Tone } | null;
type ToastState = { text: string; tone: 'success' | 'danger'; key: number } | null;

const useDialogStore = create<{ dialog: DialogState; toast: ToastState }>(() => ({ dialog: null, toast: null }));

const BAD = /could not|couldn't|not found|not saved|not confirmed|not sent|not verified|didn't|failed|error|invalid|not allowed|not right|denied|expired|too many|unavailable|problem/i;
const GOOD = /verified|saved|changed|sent|done|confirmed|closed|copied|added|success|cancelled|left |welcome|🎉/i;

function toneOf(title: string, buttons: AlertButton[]): Tone {
  if (buttons.some((b) => b.style === 'destructive')) return 'danger';
  if (BAD.test(title)) return 'danger';
  if (GOOD.test(title)) return 'success';
  return 'info';
}

let toastKey = 0;
/** Short ✓ / ! message at the top of the screen (clear of the menu and any bottom buttons). */
export function showToast(text: string, tone: 'success' | 'danger' = 'success') {
  useDialogStore.setState({ toast: { text, tone, key: ++toastKey } });
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[], opts?: { tone?: Tone }) {
  const list = buttons && buttons.length ? buttons : [{ text: 'OK' }];
  const tone = opts?.tone ?? toneOf(title, list);
  const nothingToDecide = list.length === 1 && !list[0].onPress && list[0].style !== 'destructive';
  if (tone === 'success' && nothingToDecide) { showToast(message ? `${title} · ${message}` : title, 'success'); return; }
  useDialogStore.setState({ dialog: { title, message, buttons: list, tone } });
}

const ICON: Record<Tone, string> = { info: 'i', success: '✓', warning: '!', danger: '!' };
const TONE_COLOR: Record<Tone, string> = { info: colors.primarySoft, success: colors.success, warning: '#F59E0B', danger: colors.danger };

function DialogView() {
  const d = useDialogStore((s) => s.dialog);
  const scale = useRef(new Animated.Value(0.96)).current;
  useEffect(() => { if (d) { scale.setValue(0.96); Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 6 }).start(); } }, [d]);
  if (!d) return null;
  const close = (b?: AlertButton) => { useDialogStore.setState({ dialog: null }); b?.onPress?.(); };
  // main action first, the cancel button last
  const ordered = [...d.buttons.filter((b) => b.style !== 'cancel'), ...d.buttons.filter((b) => b.style === 'cancel')];
  const cancel = d.buttons.find((b) => b.style === 'cancel');
  const col = TONE_COLOR[d.tone];
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => close(cancel ?? (d.buttons.length === 1 ? d.buttons[0] : undefined))}>
      <View style={{ flex: 1, backgroundColor: '#020617B3', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Animated.View accessibilityViewIsModal accessibilityRole="alert"
          style={{ width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18, transform: [{ scale }],
            shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 16 }}>
          <View style={{ alignSelf: 'center', width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: col + '1F', borderWidth: 1.5, borderColor: col + '66' }}>
            <Text style={{ color: col, fontSize: 24, fontWeight: '900' }}>{ICON[d.tone]}</Text>
          </View>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 19, fontWeight: '800', textAlign: 'center', lineHeight: 25 }}>{d.title}</Text>
          {d.message ? <Text style={{ color: colors.dim, fontSize: 14.5, textAlign: 'center', marginTop: 6, lineHeight: 21 }}>{d.message}</Text> : null}
          <View style={{ marginTop: 18, gap: 10 }}>
            {ordered.map((b, i) => {
              const kind = b.style === 'cancel' ? 'ghost' : b.style === 'destructive' ? 'danger' : 'primary';
              const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.danger : 'transparent';
              return (
                <Pressable key={i} onPress={() => close(b)} accessibilityRole="button" accessibilityLabel={b.text ?? 'OK'}
                  style={({ pressed }) => ({ minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: bg, borderWidth: 1,
                    borderColor: kind === 'ghost' ? colors.line : bg, opacity: pressed ? 0.85 : 1 })}>
                  <Text style={{ color: kind === 'ghost' ? colors.text : '#fff', fontWeight: '800', fontSize: 16 }}>{b.text ?? 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ToastView() {
  const t = useDialogStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-20)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!t) return;
    y.setValue(-20); op.setValue(0);
    Animated.parallel([Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }), Animated.timing(op, { toValue: 1, duration: 160, useNativeDriver: true })]).start();
    const timer = setTimeout(() => Animated.timing(op, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => useDialogStore.setState({ toast: null })), t.tone === 'danger' ? 5000 : 3600);
    return () => clearTimeout(timer);
  }, [t?.key]);
  if (!t) return null;
  const col = t.tone === 'danger' ? colors.danger : colors.success;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 10, alignItems: 'center' }}>
      <Animated.View style={{ opacity: op, transform: [{ translateY: y }] }}>
        <Pressable onPress={() => useDialogStore.setState({ toast: null })} accessibilityRole="alert" accessibilityLiveRegion="polite"
          style={{ flexDirection: 'row', alignItems: 'center', maxWidth: 520, backgroundColor: colors.elevated, borderRadius: 18, borderWidth: 1, borderColor: col + '66', paddingVertical: 10, paddingLeft: 10, paddingRight: 16,
            shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: col + '26', marginRight: 10 }}>
            <Text style={{ color: col, fontWeight: '900', fontSize: 14 }}>{t.tone === 'danger' ? '!' : '✓'}</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, flexShrink: 1, lineHeight: 19 }}>{t.text}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** Mounted once at the root of the app. */
export function DialogHost() {
  return (<><ToastView /><DialogView /></>);
}
