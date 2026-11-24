import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  } as any),
});

let registered: string | null = null;

/** Asks permission and registers this device for push. Never throws: the app works fine without it. */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;                                           // simulators cannot receive push
    if (Constants.appOwnership === 'expo' && Platform.OS === 'android') return; // Expo Go on Android has no push
    if (Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.MAX });
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const t = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (t.data === registered) return;
    await api.post('/devices', { token: t.data, platform: Platform.OS });
    registered = t.data;
  } catch (e) { console.warn('Push registration skipped:', e); }
}

export async function unregisterPush(): Promise<void> {
  try { if (registered) await api.del('/devices?token=' + encodeURIComponent(registered)); } catch {}
  registered = null;
}
