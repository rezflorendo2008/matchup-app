import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Button, Dim, Row } from '../ui';
import { ORIGIN } from '../config';
import { colors, radius } from '../theme';
import type { LiveVideo } from '../types';

/** Hosts the embedded players load from. Anything else the player tries to open goes to the phone's browser or app. */
const PLAYER_HOSTS = ['www.youtube-nocookie.com', 'www.youtube.com', 'youtube.com', 'www.facebook.com', 'player.twitch.tv', 'www.twitch.tv'];
const PROVIDER: Record<string, string> = { youtube: 'YouTube', facebook: 'Facebook', twitch: 'Twitch' };
const hostOf = (u: string) => { try { return new URL(u).host; } catch { return ''; } };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * The club's live stream on the match page. YouTube, Facebook and Twitch play inline; any other https link gets a
 * "Watch live" button. The player sits in a tiny page served "from" our site, which gives YouTube the referrer it needs
 * and Twitch its required "parent" host.
 */
export function MatchVideo({ video }: { video: LiveVideo }) {
  const [loading, setLoading] = useState(true);
  const base = useMemo(() => (/^https?:\/\//.test(ORIGIN) ? ORIGIN : 'https://pickarena.live'), []);
  const src = video.embed_url
    ? (video.provider === 'twitch' ? `${video.embed_url}&parent=${encodeURIComponent(hostOf(base).replace(/:\d+$/, ''))}` : video.embed_url)
    : null;
  const html = src
    ? `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style>`
      + `<iframe src="${esc(src)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
    : '';
  const open = () => Linking.openURL(video.url).catch(() => {});

  return (
    <View style={{ marginTop: 14, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 12 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: src ? 8 : 0 }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>📺 Live video</Text>
        <Dim style={{ fontSize: 12 }}>{src ? PROVIDER[video.provider] ?? video.provider : 'Opens the stream'}</Dim>
      </Row>
      {src ? (
        <View style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#000' }}>
          <WebView
            source={{ html, baseUrl: base }}
            originWhitelist={['*']}
            javaScriptEnabled
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            style={{ backgroundColor: '#000' }}
            onLoadEnd={() => setLoading(false)}
            // the player may load its own pages; links out of it (channel, "watch on YouTube") open outside the app
            onShouldStartLoadWithRequest={(r) => {
              if (r.url === 'about:blank' || r.url.startsWith(base) || PLAYER_HOSTS.includes(hostOf(r.url))) return true;
              if (r.url.startsWith('https://')) Linking.openURL(r.url).catch(() => {});
              return false;
            }}
            accessibilityLabel="Live video"
          />
          {loading ? <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' } as any}><ActivityIndicator color={colors.primarySoft} /></View> : null}
        </View>
      ) : null}
      <Button title={src ? 'Open in the app or browser' : '📺 Watch live'} kind={src ? 'ghost' : 'primary'} small onPress={open} style={{ marginTop: 10 }} />
    </View>
  );
}

/** Small "Watch live" tag for match cards. */
export function WatchTag({ m }: { m: { live_video?: LiveVideo | null } }) {
  if (!m.live_video) return null;
  return (
    <View style={{ backgroundColor: colors.danger + '1F', borderColor: colors.danger + '55', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 }}>
      <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '800' }}>📺 Watch live</Text>
    </View>
  );
}
