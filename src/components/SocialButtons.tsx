import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Button, Dim } from '../ui';
import { FACEBOOK_APP_ID, GOOGLE } from '../config';
import { api, errMsg } from '../api';
import { useAuth } from '../store';
import type { User } from '../types';

WebBrowser.maybeCompleteAuthSession();

type Done = (e?: string) => void;

async function finish(provider: 'google' | 'facebook', accessToken: string) {
  const r = await api.post<{ token: string; user: User }>('/auth/social', { provider, access_token: accessToken });
  await useAuth.getState().setAuth(r.token, r.user);
}

// Each button is its own component so the auth hook only runs when its client IDs exist
// (the hooks throw if a client ID is missing for the current platform).
function GoogleButton({ onError }: { onError: Done }) {
  const [busy, setBusy] = useState(false);
  const [req, res, prompt] = Google.useAuthRequest({ clientId: GOOGLE.web || undefined, iosClientId: GOOGLE.ios || undefined, androidClientId: GOOGLE.android || undefined });
  useEffect(() => {
    if (res?.type === 'success') {
      const t = (res as any).authentication?.accessToken;
      if (!t) return onError('Google did not return a token');
      setBusy(true);
      finish('google', t).catch((e) => onError(errMsg(e))).finally(() => setBusy(false));
    } else if (res?.type === 'error') onError('Google sign-in failed');
  }, [res]);
  return <Button title="Continue with Google" kind="ghost" loading={busy} disabled={!req} onPress={() => prompt()} style={{ marginBottom: 10 }} />;
}

function FacebookButton({ onError }: { onError: Done }) {
  const [busy, setBusy] = useState(false);
  const [req, res, prompt] = Facebook.useAuthRequest({ clientId: FACEBOOK_APP_ID });
  useEffect(() => {
    if (res?.type === 'success') {
      const t = (res as any).authentication?.accessToken;
      if (!t) return onError('Facebook did not return a token');
      setBusy(true);
      finish('facebook', t).catch((e) => onError(errMsg(e))).finally(() => setBusy(false));
    } else if (res?.type === 'error') onError('Facebook sign-in failed');
  }, [res]);
  return <Button title="Continue with Facebook" kind="ghost" loading={busy} disabled={!req} onPress={() => prompt()} />;
}

/** Sign in with Apple (iOS only). Uses Apple's own button so it follows Apple's design rules. */
function AppleButton({ onError }: { onError: Done }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); onError(undefined);
    try {
      const nonce = Crypto.randomUUID();
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashed,
      });
      if (!cred.identityToken) throw new Error('Apple did not return a token');
      const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
      const r = await api.post<{ token: string; user: User }>('/auth/apple', {
        identity_token: cred.identityToken, nonce, authorization_code: cred.authorizationCode ?? undefined, full_name: name || undefined,
      });
      await useAuth.getState().setAuth(r.token, r.user);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') onError(errMsg(e));   // cancelling is not an error
    } finally { setBusy(false); }
  };
  return (
    <View style={{ marginBottom: 10, opacity: busy ? 0.6 : 1 }} pointerEvents={busy ? 'none' : 'auto'}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={14} style={{ width: '100%', height: 48 }} onPress={go} />
    </View>
  );
}

export function SocialButtons({ onError }: { onError: Done }) {
  const googleReady = Platform.OS === 'ios' ? !!GOOGLE.ios : Platform.OS === 'android' ? !!GOOGLE.android : !!GOOGLE.web;
  const fbReady = !!FACEBOOK_APP_ID;
  const [appleReady, setAppleReady] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleReady).catch(() => setAppleReady(false));
  }, []);
  if (!googleReady && !fbReady && !appleReady) return <Dim style={{ textAlign: 'center', marginTop: 8 }}>Google and Facebook sign-in appear here once their IDs are set in .env</Dim>;
  return (
    <View style={{ marginTop: 8 }}>
      {appleReady ? <AppleButton onError={onError} /> : null}
      {googleReady ? <GoogleButton onError={onError} /> : null}
      {fbReady ? <FacebookButton onError={onError} /> : null}
    </View>
  );
}
