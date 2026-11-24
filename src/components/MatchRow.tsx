import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MatchStatusBadge, Row, whenShort } from '../ui';
import { MyPredicted, TeamPlayerCard, type OpenMatch } from './MatchCards';
import { colors } from '../theme';
import type { Match } from '../types';

export type { OpenMatch };

/** One match inside an event card: title, status and a prediction button for each side. */
export function MatchRow({ m, onOpen }: { m: Match; onOpen: OpenMatch }) {
  return (
    <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Pressable onPress={() => onOpen(m)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, flex: 1, marginRight: 8 }} numberOfLines={2}>{m.title}</Text>
          <MatchStatusBadge status={m.status} compact />
        </Row>
        {m.scheduled_at ? <Text style={{ color: colors.dim, fontSize: 12.5, marginTop: 2 }}>{whenShort(m.scheduled_at)}</Text> : null}
      </Pressable>
      <Row style={{ marginTop: 10, alignItems: 'stretch' }}>
        <TeamPlayerCard m={m} k="a" onOpen={onOpen} compact />
        <View style={{ width: 34, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.dim, fontWeight: '800', fontSize: 12 }}>VS</Text></View>
        <TeamPlayerCard m={m} k="b" onOpen={onOpen} compact />
      </Row>
      <MyPredicted m={m} style={{ marginTop: 8 }} />
      {m.status === 'settled' && m.result && m.result !== 'a' && m.result !== 'b' ? <Text style={{ color: colors.dim, fontSize: 12.5, marginTop: 6 }}>Result: {m.result}</Text> : null}
    </View>
  );
}
