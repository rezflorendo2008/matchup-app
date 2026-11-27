import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { PressScale, Row } from '../ui';
import { colors, radius } from '../theme';

/**
 * The player's 7-digit ID in its own box, easy to read out and one tap to copy.
 * Club owners search this number when adding diamonds.
 */
export function PlayerIdCard({ id }: { id: string | number }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const value = String(id);
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  return (
    <PressScale onPress={copy} scaleTo={0.985} accessibilityLabel={copied ? `Player ID ${value.split('').join(' ')}, copied` : `Player ID ${value.split('').join(' ')}. Double tap to copy`}
      style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: copied ? colors.success + '88' : colors.line, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ color: colors.dim, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>PLAYER ID</Text>
          <Text selectable style={{ color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: 2, marginTop: 2, fontVariant: ['tabular-nums'] }}>{value}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9,
          backgroundColor: copied ? colors.success + '22' : colors.primary + '22', borderWidth: 1, borderColor: copied ? colors.success + '88' : colors.primary + '66' }}>
          <Text style={{ color: copied ? colors.success : colors.primarySoft, fontWeight: '800', fontSize: 14 }}>{copied ? '✓ Copied' : '⧉ Copy'}</Text>
        </View>
      </Row>
      <Text style={{ color: colors.dim, fontSize: 12.5, marginTop: 6 }}>Give this number to your club owner so they can add diamonds to your account.</Text>
    </PressScale>
  );
}
