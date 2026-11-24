import React from 'react';
import { Text, View } from 'react-native';
import { PressScale, Row, whenShort } from '../ui';
import { CalendarIcon, ChevronRightIcon, MapPinIcon } from '../icons';
import { colors, radius } from '../theme';
import type { EventItem } from '../types';

/** Event row with its sport icon, title, date/time and location. */
export function EventListCard({ e, onPress, past }: { e: EventItem; onPress: () => void; past?: boolean }) {
  return (
    <PressScale onPress={onPress} scaleTo={0.985} style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 10, opacity: past ? 0.7 : 1 }}>
      <Row>
        <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 24 }}>{e.category_icon || '🏆'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.primarySoft, fontSize: 11.5, fontWeight: '700' }} numberOfLines={1}>{e.category ?? 'Event'}</Text>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15.5, marginTop: 1 }} numberOfLines={1}>{e.title}</Text>
          <Row style={{ marginTop: 4 }}>
            <CalendarIcon size={13} />
            <Text style={{ color: colors.dim, fontSize: 12, marginLeft: 4 }} numberOfLines={1}>{whenShort(e.starts_at)}</Text>
            {e.location ? <><View style={{ width: 8 }} /><MapPinIcon size={13} /><Text style={{ color: colors.dim, fontSize: 12, marginLeft: 4, flexShrink: 1 }} numberOfLines={1}>{e.location}</Text></> : null}
          </Row>
        </View>
        <ChevronRightIcon />
      </Row>
    </PressScale>
  );
}
