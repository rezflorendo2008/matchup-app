import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ORIGIN, REVERB, REALTIME_ON } from './config';
import { useAuth } from './store';

/** Optional websocket updates (Laravel Reverb). Without EXPO_PUBLIC_REVERB_KEY the screens poll instead. */
export function useRealtime(clubIds: number[]) {
  const qc = useQueryClient();
  const token = useAuth((s) => s.token);
  const userId = useAuth((s) => s.user?.id);
  const clubKey = clubIds.join(',');

  useEffect(() => {
    if (!REALTIME_ON || !token || !userId) return;
    let echo: any;
    try {
      const Pusher = require('pusher-js/react-native');
      const Echo = require('laravel-echo');
      (globalThis as any).Pusher = Pusher.default ?? Pusher;
      const EchoClass = Echo.default ?? Echo;
      echo = new EchoClass({
        broadcaster: 'reverb', key: REVERB.key, wsHost: REVERB.host, wsPort: REVERB.port, wssPort: REVERB.port,
        forceTLS: REVERB.tls, enabledTransports: ['ws', 'wss'],
        authEndpoint: `${ORIGIN}/broadcasting/auth`, auth: { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      });
      const refresh = (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      echo.private(`user.${userId}`).listen('.user.updated', (e: any) => {
        if (e.kind === 'wallet') refresh(['wallets', 'tx']);
        else if (e.kind === 'prediction') refresh(['predictions', 'matches', 'wallets']);
        else if (e.kind === 'membership') refresh(['clubs', 'matches', 'home']);
        else refresh(['me']);
      });
      clubKey.split(',').filter(Boolean).forEach((id) =>
        echo.private(`club.${id}`).listen('.match.updated', () => refresh(['matches', 'match', 'home'])));
    } catch (e) { console.warn('Realtime disabled:', e); }
    return () => { try { echo?.disconnect(); } catch {} };
  }, [token, userId, clubKey, qc]);
}
