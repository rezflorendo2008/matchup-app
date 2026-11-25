import React, { useEffect } from 'react';
import { AppState, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { api } from './src/api';
import { registerForPush } from './src/push';
import { clearPending, parseJoinUrl, readPending, savePending } from './src/pending';
import { useRealtime } from './src/realtime';
import { useAuth } from './src/store';
import { useMaint } from './src/maintenance';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import { BASE } from './src/config';
import { c, ScreenSkeleton } from './src/ui';
import { BottomNavigation } from './src/components/BottomNavigation';
import { colors } from './src/theme';
import { warnIfDeviceCompromised } from './src/security';
import type { Club, User } from './src/types';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import ClubsScreen from './src/screens/ClubsScreen';
import DiamondsScreen from './src/screens/DiamondsScreen';
import AddDiamondsScreen from './src/screens/AddDiamondsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PredictionScreen from './src/screens/PredictionScreen';
import ClubScreen from './src/screens/ClubScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import VerifyScreen from './src/screens/VerifyScreen';
import EventScreen from './src/screens/EventScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import DeleteAccountScreen from './src/screens/DeleteAccountScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ReferralScreen from './src/screens/ReferralScreen';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5000 } } });
const nav = createNavigationContainerRef<any>();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg2, border: colors.line, primary: colors.primary, text: colors.text } };

function Tabs() {
  return (
    <Tab.Navigator tabBar={(p) => <BottomNavigation {...p} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Clubs" component={ClubsScreen} />
      <Tab.Screen name="Diamonds" component={DiamondsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

/** Keeps the session fresh: refreshes the profile, registers push, and opens live updates. */
function Session() {
  const setUser = useAuth((s) => s.setUser);
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: () => api.get<Club[]>('/clubs') });
  useRealtime((clubs.data ?? []).filter((x) => x.membership === 'approved').map((x) => x.id));
  useEffect(() => { api.get<User>('/me').then(setUser).catch(() => {}); registerForPush(); }, []);
  // An invite link opened before sign-up: send the player to the club join as soon as they are in.
  useEffect(() => {
    let tries = 0;
    const t = setInterval(async () => {
      if (++tries > 20) return clearInterval(t);
      if (!nav.isReady()) return;
      clearInterval(t);
      const p = await readPending();
      if (!p) return;
      await clearPending();
      nav.navigate('Tabs', { screen: 'Clubs', params: { slug: p.slug, ref: p.ref } });
    }, 300);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const d: any = r.notification.request.content.data ?? {};
      if (!nav.isReady()) return;
      if (d.type === 'match' && d.match_id) nav.navigate('Prediction', { id: Number(d.match_id) });
      else if (d.type === 'referral') nav.navigate('Referral');
      else if (d.type === 'diamonds' || d.type === 'wallet') nav.navigate('Tabs', { screen: 'Diamonds' });
    });
    return () => sub.remove();
  }, []);
  return null;
}

function Root() {
  const { hydrated, token, hydrate } = useAuth();
  useEffect(() => { hydrate(); }, []);
  // Signed out: remember invite links (pickarena://join/<club>?ref=CODE) so they survive sign-up.
  useEffect(() => {
    if (token) return;
    const keep = (url?: string | null) => { const p = parseJoinUrl(url); if (p) savePending(p); };
    Linking.getInitialURL().then(keep).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => keep(e.url));
    return () => sub.remove();
  }, [token]);
  const maint = useMaint((s) => s.on);
  // Ask the server once at start (and when the app returns to the foreground) so people see the maintenance page before anything fails.
  useEffect(() => {
    const ask = () => fetch(`${BASE}/status`, { headers: { Accept: 'application/json' } }).then((r) => r.json())
      .then((s) => { if (s?.maintenance) useMaint.getState().set({ title: s.title, message: s.message, eta: s.eta }); }).catch(() => {});
    ask();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') ask(); });
    return () => sub.remove();
  }, []);
  if (!hydrated) return <ScreenSkeleton />;
  if (maint) return <MaintenanceScreen />;

  const linking = {
    prefixes: ['pickarena://'],
    config: { screens: { Tabs: { screens: { Clubs: 'join/:slug' } } } },
  };

  return (
    <NavigationContainer ref={nav} theme={theme} linking={token ? (linking as any) : undefined}>
      {token ? (
        <>
          <Session />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="Prediction" component={PredictionScreen} />
            <Stack.Screen name="Club" component={ClubScreen} />
            <Stack.Screen name="AddDiamonds" component={AddDiamondsScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Verify" component={VerifyScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Referral" component={ReferralScreen} />
            <Stack.Screen name="Event" component={EventScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
          </Stack.Navigator>
        </>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => { warnIfDeviceCompromised(); }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <StatusBar style="light" />
        <Root />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
