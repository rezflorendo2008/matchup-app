import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MatchStatusBadge, Row, whenShort } from '../ui';
import { MyPredicted, TeamPlayerCard, type OpenMatch } from './MatchCards';
import { WatchTag } from './MatchVideo';
import { colors } from '../theme';
import type { Match } from '../types';

export type { OpenMatch };

/** One match inside an event card: title, status and a prediction button for each side. */
export function MatchRow({ m, onOpen }: { m: Match; onOpen: OpenMatch }) {
  return (
    <View style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Pressable onPress={() => onOpen(m)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, flex: 1, marginRight: 8 }} numberOfLines={2}>{m.title}</Text>
          <MatchStatusBadge status={m.status} compact />
        </Row>
        {m.scheduled_at || m.live_video ? (
          <Row style={{ justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={{ color: colors.dim, fontSize: 11.5 }}>{m.scheduled_at ? whenShort(m.scheduled_at) : ''}</Text>
            <WatchTag m={m} />
          </Row>
        ) : null}
      </Pressable>
      <Row style={{ marginTop: 10, alignItems: 'stretch' }}>
        <TeamPlayerCard m={m} k="a" onOpen={onOpen} mini />
        <View style={{ width: 24, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.dim, fontWeight: '800', fontSize: 10.5 }}>VS</Text></View>
        <TeamPlayerCard m={m} k="b" onOpen={onOpen} mini />
      </Row>
      <MyPredicted m={m} style={{ marginTop: 6, fontSize: 11 }} />
      {m.status === 'settled' && m.result && m.result !== 'a' && m.result !== 'b' ? <Text style={{ color: colors.dim, fontSize: 12.5, marginTop: 6 }}>Result: {m.result}</Text> : null}
    </View>
  );
}
