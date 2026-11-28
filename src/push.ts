import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

// A push that arrives while the app is open still shows as a banner (and in the list).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  } as any),
});

let registered: string | null = null;

/**
 * 'on'           notifications are allowed and this device is registered
 * 'off'          not asked yet, or allowed but not registered: can be turned on in the app
 * 'blocked'      switched off in the phone's settings: only the settings page can turn them back on
 * 'unavailable'  simulators, and Expo Go on Android, cannot receive push
 */
export type PushState = 'on' | 'off' | 'blocked' | 'unavailable';

const canPush = () => Device.isDevice && !(Constants.appOwnership === 'expo' && Platform.OS === 'android');

export async function pushState(): Promise<PushState> {
  try {
    if (!canPush()) return 'unavailable';
    const p = await Notifications.getPermissionsAsync();
    if (p.status === 'granted') return registered ? 'on' : 'off';
    return p.canAskAgain === false ? 'blocked' : 'off';
  } catch { return 'unavailable'; }
}

/** Asks permission (once) and registers this device for push. Never throws: the app works fine without it. Returns the state afterwards. */
export async function registerForPush(): Promise<PushState> {
  try {
    if (!canPush()) return 'unavailable';
    if (Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync('default', { name: 'Matches, results and diamonds', importance: Notifications.AndroidImportance.MAX });
    let p = await Notifications.getPermissionsAsync();
    if (p.status !== 'granted' && p.canAskAgain !== false) p = await Notifications.requestPermissionsAsync();
    if (p.status !== 'granted') return p.canAskAgain === false ? 'blocked' : 'off';
    const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const t = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (t.data !== registered) { await api.post('/devices', { token: t.data, platform: Platform.OS }); registered = t.data; }
    return 'on';
  } catch (e) { console.warn('Push registration skipped:', e); return 'off'; }
}

export async function unregisterPush(): Promise<void> {
  try { if (registered) await api.del('/devices?token=' + encodeURIComponent(registered)); } catch {}
  registered = null;
}

/** The phone's settings page for this app (the only place to undo "Don't allow"). */
export const openPushSettings = () => Linking.openSettings().catch(() => {});
