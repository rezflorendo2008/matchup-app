import React from 'react';
import { Text } from 'react-native';
import { Notice } from '../ui';
import { colors } from '../theme';

/** Shown wherever a suspended member would act: they can look, but not predict, request diamonds or earn from referrals. */
export function SuspendedNotice({ club, style }: { club: { name: string; suspend_reason?: string | null }; style?: any }) {
  return (
    <Notice tone="warning" style={style}>
      <Text style={{ color: colors.text, fontWeight: '800' }}>Your membership in {club.name} is suspended</Text>
      <Text style={{ color: colors.text, marginTop: 2, lineHeight: 20 }}>
        {club.suspend_reason ? `Reason: ${club.suspend_reason}. ` : ''}You can still see the club and your diamonds, but you can't make predictions, request diamonds or earn from referrals until the club lifts it.
      </Text>
    </Notice>
  );
}
