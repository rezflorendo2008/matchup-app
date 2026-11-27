import { BrandMark, DiamondGem } from './components/Brand';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { POLL_MS } from './config';
import { colors, font, radius, shadow, spacing } from './theme';
import { AlertIcon, BellIcon, CheckBadgeIcon, ChevronDownIcon, ChevronLeftIcon, DiamondIcon, PlusIcon } from './icons';
import type { Club } from './types';
import { useClubContext } from './club';

/** Colour aliases kept for the existing screens; new code should import from ./theme. */
export const c = {
  bg: colors.bg, card: colors.card, card2: colors.elevated, line: colors.line, text: colors.text, dim: colors.dim,
  brand: colors.primary, good: colors.success, bad: colors.danger, warn: colors.amber, a: colors.primary, b: colors.warning,
};

/** Diamonds are shown without trailing zeros: 1,250 or 87.5 */
export const pts = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
export const whenShort = (iso?: string | null) => (iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

/* ---------- press feedback ---------- */

/** Wraps children in a Pressable that gently scales down while pressed. */
export function PressScale({ children, onPress, style, wrapStyle, disabled, scaleTo = 0.97, accessibilityLabel, hitSlop }: {
  children: React.ReactNode; onPress?: () => void; style?: any; wrapStyle?: any; disabled?: boolean; scaleTo?: number; accessibilityLabel?: string; hitSlop?: number;
}) {
  const v = useRef(new Animated.Value(1)).current;
  // a flex size on the card must also apply to the touchable wrapper, or the card shrinks to its content
  const flat: any = StyleSheet.flatten(style) || {};
  const auto = flat.flex != null ? { flex: flat.flex } : undefined;
  const to = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <Pressable onPress={onPress} disabled={disabled || !onPress} onPressIn={() => to(scaleTo)} onPressOut={() => to(1)}
      accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={hitSlop} style={[auto, wrapStyle]}>
      <Animated.View style={[{ transform: [{ scale: v }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------- header & wallet ---------- */

export function Logo({ size = 30, compact }: { size?: number; compact?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} accessible accessibilityLabel="PickArena">
      <BrandMark size={size * 1.25} />
      {compact ? null : <Text style={[s.brand, { marginLeft: 6 }]}>Pick<Text style={{ color: colors.primarySoft }}>Arena</Text></Text>}
    </View>
  );
}

/** Total diamonds with a compact "+" that opens Add Diamonds. */
export function DiamondWalletButton() {
  const nav = useNavigation<any>();
  const { total } = useClubContext();   // the club you're in (or your only club)
  return (
    <PressScale onPress={() => nav.navigate('Diamonds')} accessibilityLabel="My diamonds" hitSlop={8} style={s.pill}>
      <DiamondGem size={18} />
      <Text style={s.pillText}>{pts(total)}</Text>
      <View style={s.plus}><PlusIcon size={14} color={colors.white} /></View>
    </PressScale>
  );
}

/** The club you're in, next to the diamonds (only with 2+ clubs, not on Home); tap to switch. */
export function ClubChip() {
  const nav = useNavigation<any>();
  const route = useRoute();
  const { multi, active } = useClubContext();
  // only on subpages: on Home the welcome card has Switch club
  if (!multi || route.name === 'Home') return null;
  return (
    <PressScale onPress={() => nav.navigate('ChooseClub')} accessibilityLabel={active ? `Club: ${active.name}. Switch club` : 'Choose a club'} hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'center', height: 40, maxWidth: 140, paddingLeft: 6, paddingRight: 10, marginRight: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
      {active ? <ClubAvatar name={active.name} logo={active.logo} size={22} /> : null}
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginLeft: 6, flexShrink: 1 }} numberOfLines={1}>{active ? active.name : 'Choose club'}</Text>
      <ChevronDownIcon size={14} />
    </PressScale>
  );
}

/** Bell with an unread counter; opens the notification centre. */
/** "Verified" pill shown next to a player's name once email/phone and ID are both verified. */
export function VerifiedPill({ small }: { small?: boolean }) {
  return (
    <View accessibilityLabel="Verified account" style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.success + '22', borderColor: colors.success + '88', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: small ? 8 : 10, paddingVertical: small ? 2 : 4 }}>
      <CheckBadgeIcon size={small ? 13 : 15} color={colors.success} />
      <Text style={{ color: colors.success, fontWeight: '800', fontSize: small ? 11 : 12, marginLeft: 4 }}>Verified</Text>
    </View>
  );
}

export function AppHeader() {
  const { multi } = useClubContext();   // with the club chip there, show just the logo mark
  return (
    <View style={s.bar}>
      <Logo compact={multi} />
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginLeft: 8 }}>
        <ClubChip />
        <DiamondWalletButton />
      </View>
    </View>
  );
}

/** Display names are short like usernames (24 characters, letters, numbers, spaces and . _ - '); shows a live counter. */
export const NAME_MAX = 24;
export function NameField({ label = 'Display name', value, onChangeText, error, ...p }: TextInputProps & { label?: string; value: string; onChangeText: (v: string) => void; error?: string | null }) {
  const n = value.trim().length;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Field label={label} value={value} onChangeText={onChangeText} maxLength={NAME_MAX} autoCapitalize="words" autoCorrect={false} {...p} error={error} style={[p.style as any, { marginBottom: 0 }]} />
      <Text style={{ color: n > 0 && n < 2 ? colors.danger : colors.dim, fontSize: 11.5, marginTop: -6 }}>{n}/{NAME_MAX} · letters, numbers, spaces and . _ - '</Text>
    </View>
  );
}

/** Shown on every screen while a club has not decided on the player's join request yet. */
export function PendingNotice() {
  const nav = useNavigation<any>();
  const q = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs'), refetchInterval: POLL_MS });
  const names = (q.data ?? []).filter((c) => c.membership === 'pending').map((c) => c.name);
  if (!names.length) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return (
    <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Clubs' })} accessibilityRole="button" accessibilityLabel={`Waiting for club approval. ${list} will verify you soon.`}
      style={{ marginHorizontal: spacing.lg, marginTop: 8, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: colors.amber + '1A', borderWidth: 1, borderColor: colors.amber + '66' }}>
      <Text style={{ color: colors.amber, fontWeight: '800', fontSize: 12.5 }} numberOfLines={1}>⏳ Waiting for club approval · <Text style={{ color: colors.text }}>{list}</Text></Text>
      <Text style={{ color: colors.dim, fontSize: 11.5, marginTop: 1 }} numberOfLines={1}>Predictions unlock once the club approves you.</Text>
    </Pressable>
  );
}

/** Header for pushed (detail) screens: back arrow, title and an optional action on the right. Stays fixed while the page scrolls. */
export function TopBar({ title, right, onBack, hideBack }: { title?: string; right?: React.ReactNode; onBack?: () => void; hideBack?: boolean }) {
  const nav = useNavigation<any>();
  const back = onBack ?? (() => (nav.canGoBack() ? nav.goBack() : nav.navigate('Tabs')));
  return (
    <View style={s.topBar}>
      {hideBack ? <View style={{ width: 40 }} /> : (
        <PressScale onPress={back} accessibilityLabel="Go back" hitSlop={8} style={s.backBtn}>
          <ChevronLeftIcon size={22} color={colors.text} />
        </PressScale>
      )}
      <Text style={s.topTitle} numberOfLines={1} accessibilityRole="header">{title ?? ''}</Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/**
 * Page wrapper. Tab screens get the brand header; give a `title` to get the back-arrow TopBar instead (detail screens).
 * `footer` is pinned to the bottom above the keyboard, for the screen's main action.
 */
export function Screen({ children, scroll = true, onRefresh, refreshing = false, edges, hideBar = false, title, right, footer, hideBack }: {
  children: React.ReactNode; scroll?: boolean; onRefresh?: () => void; refreshing?: boolean; edges?: ('top' | 'bottom')[]; hideBar?: boolean;
  title?: string; right?: React.ReactNode; footer?: React.ReactNode; hideBack?: boolean;
}) {
  const detail = title !== undefined;
  const body = scroll ? (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: footer ? 24 : 48 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag" refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primarySoft} /> : undefined}>
      {children}
    </ScrollView>
  ) : children;
  return (
    <SafeAreaView style={s.screen} edges={edges ?? (detail ? ['top', 'bottom'] : ['top'])}>
      {hideBar ? null : detail ? <TopBar title={title} right={right} hideBack={hideBack} /> : <AppHeader />}
      {hideBar ? null : <PendingNotice />}
      {footer ? (
        // Android draws edge to edge (behind the keyboard), so the window no longer shrinks for it: pad on both platforms.
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          {body}
          <View style={s.footer}>{footer}</View>
        </KeyboardAvoidingView>
      ) : body}
    </SafeAreaView>
  );
}

/* ---------- text ---------- */

export const H1 = ({ children }: { children: React.ReactNode }) => <Text style={s.h1}>{children}</Text>;
export const H2 = ({ children, style }: { children: React.ReactNode; style?: any }) => <Text style={[s.h2, style]}>{children}</Text>;
export const Dim = ({ children, style, numberOfLines }: { children?: React.ReactNode; style?: any; numberOfLines?: number }) => <Text style={[s.dim, style]} numberOfLines={numberOfLines}>{children}</Text>;
export const T = ({ children, style, numberOfLines, selectable }: { children?: React.ReactNode; style?: any; numberOfLines?: number; selectable?: boolean }) =>
  <Text style={[s.text, style]} numberOfLines={numberOfLines} selectable={selectable}>{children}</Text>;

/** Section title with an optional action on the right ("See all"). */
export function SectionHeader({ title, action, onAction, small }: { title: string; action?: string; onAction?: () => void; small?: boolean }) {
  return (
    <View style={[s.sectionHead, small && { marginTop: spacing.lg, marginBottom: 10 }]}>
      <Text style={[s.sectionTitle, small && { fontSize: 16 }]}>{title}</Text>
      {action && onAction ? <Pressable onPress={onAction} hitSlop={10}><Text style={s.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

/* ---------- surfaces & controls ---------- */

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) return <PressScale onPress={onPress} scaleTo={0.985} style={[s.card, style]}>{children}</PressScale>;
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ title, onPress, kind = 'primary', loading, disabled, style, small }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; loading?: boolean; disabled?: boolean; style?: ViewStyle; small?: boolean;
}) {
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.danger : 'transparent';
  return (
    <PressScale onPress={onPress} disabled={disabled || loading} scaleTo={0.98}
      style={[s.btn, small && { paddingVertical: 10, minHeight: 42 }, { backgroundColor: bg, borderColor: kind === 'ghost' ? colors.line : bg, opacity: disabled ? 0.45 : 1 }, style]}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={[s.btnText, small && { fontSize: 15 }, kind === 'ghost' && { color: colors.text }]}>{title}</Text>}
    </PressScale>
  );
}

/** Red ! icon and message under a text box. */
export function FieldError({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6 }}>
      <View style={{ width: 17, height: 17, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginRight: 7, marginTop: 1 }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>!</Text>
      </View>
      <Text style={{ flex: 1, color: '#FCA5A5', fontSize: 13, fontWeight: '600', lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

/** Message box inside a form or page: error · warning · info · success, with an icon. */
export function Notice({ tone = 'info', children, style }: { tone?: 'error' | 'warning' | 'info' | 'success'; children: React.ReactNode; style?: ViewStyle }) {
  const col = tone === 'error' ? colors.danger : tone === 'warning' ? '#F59E0B' : tone === 'success' ? colors.success : colors.primary;
  const ic = tone === 'success' ? '✓' : tone === 'info' ? 'i' : '!';
  return (
    <View accessibilityRole={tone === 'error' ? 'alert' : undefined} style={[{ flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: col + '66', backgroundColor: col + '14', marginTop: 12 }, style]}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: col, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>{ic}</Text>
      </View>
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{children}</Text> : children}</View>
    </View>
  );
}

/** Text box with a label; `error` turns it red with the message under it. */
export function Field({ label, error, ...p }: TextInputProps & { label?: string; error?: string | null }) {
  const secure = !!p.secureTextEntry;
  const [shown, setShown] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={[s.label, error ? { color: colors.danger } : null]}>{label}</Text> : null}
      <View>
        <TextInput placeholderTextColor={colors.dim} autoCapitalize="none" {...p} secureTextEntry={secure && !shown}
          style={[s.input, p.style, secure ? { paddingRight: 64 } : null, error ? { borderColor: colors.danger, backgroundColor: colors.danger + '0F' } : null]} />
        {secure ? (
          <Pressable onPress={() => setShown(!shown)} hitSlop={10} accessibilityRole="button" accessibilityLabel={shown ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, paddingHorizontal: 14, justifyContent: 'center' }}>
            <Text style={{ color: colors.primarySoft, fontWeight: '700', fontSize: 14 }}>{shown ? 'Hide' : 'Show'}</Text>
          </Pressable>
        ) : null}
      </View>
      <FieldError text={error} />
    </View>
  );
}

export function Chip({ label, active, onPress, disabled, style }: { label: string; active?: boolean; onPress: () => void; disabled?: boolean; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: !!active, disabled: !!disabled }} hitSlop={4}
      style={[s.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }, disabled && { opacity: 0.4 }, style]}>
      {/* simple line breaking + one line: Android otherwise measures emoji labels too narrow and wraps the word out of sight */}
      <Text numberOfLines={1} textBreakStrategy="simple" style={{ color: active ? '#fff' : colors.dim, fontWeight: '600', fontSize: font.size.sm }}>{label}</Text>
    </Pressable>
  );
}

/* ---------- status & verification ---------- */

const tone: Record<string, string> = {
  open: colors.success, won: colors.success, approved: colors.success, verified: colors.success, active: colors.success, confirmed: colors.primary, upcoming: colors.primary,
  paused: colors.amber, pending: colors.amber, pending_confirm: colors.amber, closed: colors.dim, settled: colors.dim,
  lost: colors.danger, rejected: colors.danger, blocked: colors.danger, suspended: colors.danger, refunded: colors.dim, cancelled: colors.dim,
};
export function Badge({ text }: { text: string }) {
  const col = tone[text] ?? colors.dim;
  const label = text === 'approved' ? '✓ verified' : text.replace('_', ' ');
  return <View style={[s.badge, { borderColor: col + '66', backgroundColor: col + '1F' }]}><Text style={{ color: col, fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text></View>;
}

/** OPEN (predictions open today) and LIVE (predictions closed, match being played) pulse; then PAUSED, UPCOMING, COMPLETED. */
export function MatchStatusBadge({ status, compact }: { status: string; compact?: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const live = status === 'open' || status === 'closed';
  useEffect(() => {
    if (!live) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.25, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [live]);
  const map: Record<string, { label: string; col: string }> = {
    open: { label: 'OPEN', col: colors.success }, paused: { label: 'PAUSED', col: colors.amber }, upcoming: { label: 'UPCOMING', col: colors.primarySoft },
    closed: { label: 'LIVE', col: colors.danger }, settled: { label: 'COMPLETED', col: colors.dim }, draft: { label: 'DRAFT', col: colors.dim },
  };
  const m = map[status] ?? { label: status.toUpperCase(), col: colors.dim };
  return (
    <View style={[s.status, { backgroundColor: m.col + '1F', borderColor: m.col + '55' }, compact && { paddingVertical: 2 }]}>
      {live ? <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: m.col, marginRight: 5, opacity: pulse }} /> : null}
      <Text style={{ color: m.col, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 }}>{m.label}</Text>
    </View>
  );
}

/** Club icon: the club's logo, or its first letter when it has none. */
export function ClubAvatar({ name, logo, size = 22 }: { name: string; logo?: string | null; size?: number }) {
  if (logo) return <Image source={{ uri: logo }} style={{ width: size, height: size, borderRadius: size / 2, marginRight: 8, backgroundColor: colors.elevated }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, marginRight: 8, backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: size * 0.46 }}>{(name || '?').trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** Verified tick shown next to verified clubs. */
export function ClubVerificationBadge({ size = 16 }: { size?: number }) {
  return <View accessibilityLabel="Verified" style={{ marginLeft: 5 }}><CheckBadgeIcon size={size} color={colors.primary} /></View>;
}
export const VerifiedIcon = ClubVerificationBadge;

/** Round avatar for a team or player; shows initials (the API has no team logos). */
export function TeamAvatar({ name, size = 44, color = colors.primary }: { name: string; size?: number; color?: string }) {
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '24', borderWidth: 1.5, borderColor: color + '88', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

/* ---------- loading, empty, error ---------- */

/** Placeholder block with a light band sweeping across it (the "shimmer" used by Facebook and most feed apps). */
const SLICES = [0.0, 0.02, 0.04, 0.06, 0.08, 0.06, 0.04, 0.02, 0.0];
const BAND = 160;
export function Skeleton({ height = 16, width = '100%', radiusPx = 8, style }: { height?: number; width?: number | string; radiusPx?: number; style?: any }) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  const tx = x.interpolate({ inputRange: [0, 1], outputRange: [-BAND, Math.max(w, 1)] });
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ height, width: width as any, borderRadius: radiusPx, backgroundColor: colors.elevated, overflow: 'hidden' }, style]}>
      {w > 0 ? (
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: BAND, flexDirection: 'row', transform: [{ translateX: tx }] }}>
          {SLICES.map((o, i) => <View key={i} style={{ flex: 1, backgroundColor: `rgba(255,255,255,${o})` }} />)}
        </Animated.View>
      ) : null}
    </View>
  );
}

type SkeletonKind = 'list' | 'match' | 'club';

/** Card-shaped placeholders that look like the content that is loading. */
export function CardSkeleton({ rows = 3, kind = 'list' }: { rows?: number; kind?: SkeletonKind }) {
  return (
    <>{Array.from({ length: rows }).map((_, i) => (
      <View key={i} style={s.card}>
        {kind === 'match' ? (
          <>
            <Row><Skeleton width={18} height={18} radiusPx={9} /><Skeleton width="38%" height={12} style={{ marginLeft: 8 }} /></Row>
            <Skeleton width="62%" height={18} style={{ marginTop: 12 }} />
            <Row style={{ marginTop: 14, gap: 10 }}>
              <View style={{ flex: 1 }}><Skeleton height={64} radiusPx={14} /></View>
              <View style={{ flex: 1 }}><Skeleton height={64} radiusPx={14} /></View>
            </Row>
          </>
        ) : kind === 'club' ? (
          <>
            <Row>
              <Skeleton width={44} height={44} radiusPx={22} />
              <View style={{ flex: 1, marginLeft: 12 }}><Skeleton width="55%" height={16} /><Skeleton width="35%" height={12} style={{ marginTop: 8 }} /></View>
            </Row>
            <Skeleton height={40} radiusPx={12} style={{ marginTop: 14 }} />
          </>
        ) : (
          <>
            <Skeleton width="45%" height={12} />
            <Skeleton height={22} style={{ marginTop: 12 }} />
            <Skeleton width="70%" height={12} style={{ marginTop: 12 }} />
          </>
        )}
      </View>
    ))}</>
  );
}

/** Full-screen placeholder shown while the app starts (replaces the spinner). */
export function ScreenSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg, paddingTop: 64 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 20 }}><Skeleton width={120} height={26} /><Skeleton width={64} height={30} radiusPx={15} /></Row>
      <Skeleton height={110} radiusPx={18} style={{ marginBottom: 16 }} />
      <CardSkeleton rows={2} kind="match" />
    </View>
  );
}

export const Loading = () => <CardSkeleton rows={2} />;

export function EmptyState({ title, text, icon, actionLabel, onAction }: { title?: string; text: string; icon?: React.ReactNode; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>{icon ?? <DiamondIcon size={26} color={colors.dim} />}</View>
      {title ? <Text style={[s.text, { fontWeight: '700', marginBottom: 4, textAlign: 'center' }]}>{title}</Text> : null}
      <Text style={[s.dim, { textAlign: 'center' }]}>{text}</Text>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} small style={{ marginTop: spacing.md, paddingHorizontal: 22 }} /> : null}
    </View>
  );
}
export const Empty = ({ text }: { text: string }) => <EmptyState text={text} />;

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <View style={[s.card, { borderColor: colors.danger + '88', backgroundColor: colors.danger + '12' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: onRetry ? 10 : 0 }}>
        <AlertIcon size={18} />
        <Text style={[s.text, { color: colors.danger, marginLeft: 8, flex: 1 }]}>{msg}</Text>
      </View>
      {onRetry ? <Button title="Try again" kind="ghost" small onPress={onRetry} /> : null}
    </View>
  );
}

export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  h1: { color: colors.text, fontSize: font.size.xxl, fontWeight: '800', marginBottom: spacing.md, letterSpacing: -0.4 },
  h2: { color: colors.text, fontSize: font.size.lg, fontWeight: '700', marginTop: spacing.xl - 6, marginBottom: 10 },
  text: { color: colors.text, fontSize: font.size.md },
  dim: { color: colors.dim, fontSize: font.size.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: 12 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.2 },
  sectionAction: { color: colors.primarySoft, fontSize: font.size.sm, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  btn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, minHeight: 44 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { color: colors.dim, fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: colors.bg2, color: colors.text, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, marginRight: 8, backgroundColor: colors.card },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  brand: { color: colors.text, fontWeight: '800', fontSize: 20, letterSpacing: -0.4 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.pill, paddingLeft: 11, paddingRight: 4, paddingVertical: 4, borderWidth: 1, borderColor: colors.line },
  pillText: { color: colors.text, fontWeight: '800', fontSize: 15, marginHorizontal: 7 },
  plus: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  badge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  status: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  shadow: shadow.card as any,
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: colors.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  topTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center', marginHorizontal: 8, letterSpacing: -0.2 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 10, backgroundColor: colors.bg2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
