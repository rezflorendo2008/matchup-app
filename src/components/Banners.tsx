import React from 'react';
import { Image, Text, View } from 'react-native';
import { Button, PressScale, Row } from '../ui';
import { MegaphoneIcon } from '../icons';
import { colors, radius, spacing } from '../theme';
import type { Promo } from '../types';

/** Personal greeting with the main call to action. */
export function WelcomeBanner({ name, hasClubs, liveCount, onExplore }: { name: string; hasClubs: boolean; liveCount: number; onExplore: () => void }) {
  const first = (name || '').trim().split(/\s+/)[0] || 'there';
  return (
    <View style={{ backgroundColor: colors.elevated, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg + 2, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: colors.primary, opacity: 0.18 }} />
      <View style={{ position: 'absolute', right: 30, bottom: -50, width: 100, height: 100, borderRadius: 50, backgroundColor: colors.warning, opacity: 0.1 }} />
      <Text style={{ color: colors.primarySoft, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.6 }}>WELCOME BACK</Text>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 4, letterSpacing: -0.4 }}>Hi {first} 👋</Text>
      <Text style={{ color: colors.dim, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
        Predict match results with friends in your clubs and earn diamonds. Just for fun, with no real money.
      </Text>
      <Button small title={hasClubs ? (liveCount > 0 ? `${liveCount} live now · View matches` : 'Explore matches') : 'Find a club'} onPress={onExplore} style={{ marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 18 }} />
    </View>
  );
}

/** Admin-managed promo (horizontal carousel item). */
export function PromoBanner({ p, width, onPress }: { p: Promo; width: number; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} scaleTo={0.98} style={{ width, marginRight: 10, backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>
      {p.image_only && p.image ? (
        <Image source={{ uri: p.image }} style={{ width: '100%', flex: 1, minHeight: 130, aspectRatio: 2 }} resizeMode="cover" accessibilityLabel={p.title} />
      ) : (
        <>
          {p.image ? <Image source={{ uri: p.image }} style={{ width: '100%', height: 130 }} resizeMode="cover" /> : null}
          <View style={{ padding: 14 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17 }}>{p.title}</Text>
            {p.subtitle ? <Text style={{ color: colors.dim, fontSize: 13, marginTop: 4 }}>{p.subtitle}</Text> : null}
          </View>
        </>
      )}
    </PressScale>
  );
}

/** Clearly labelled advertisement; always rendered away from match information. */
export function SponsoredBanner({ ad, onPress }: { ad: Promo; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} scaleTo={0.985} style={{ backgroundColor: colors.bg2, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', padding: 12, marginBottom: 10 }}>
      <Row style={{ marginBottom: 8 }}>
        <MegaphoneIcon size={14} color={colors.dim} />
        <Text style={{ color: colors.dim, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginLeft: 6 }}>SPONSORED{ad.sponsor ? ` · ${ad.sponsor.toUpperCase()}` : ''}</Text>
      </Row>
      {ad.image_only && ad.image ? (
        <Image source={{ uri: ad.image }} style={{ width: '100%', aspectRatio: 2, borderRadius: radius.md, backgroundColor: colors.elevated }} resizeMode="cover" accessibilityLabel={ad.title} />
      ) : (
      <Row>
        {ad.image ? <Image source={{ uri: ad.image }} style={{ width: 56, height: 56, borderRadius: radius.md, marginRight: 12, backgroundColor: colors.elevated }} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }} numberOfLines={2}>{ad.title}</Text>
          {ad.subtitle ? <Text style={{ color: colors.dim, fontSize: 12.5, marginTop: 2 }} numberOfLines={2}>{ad.subtitle}</Text> : null}
        </View>
      </Row>
      )}
    </PressScale>
  );
}
