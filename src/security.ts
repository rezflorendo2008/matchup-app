import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { showAlert } from './dialog';

/**
 * Warns (once per launch) when the phone is rooted or jailbroken. Such devices can read other apps' data, so PickArena tells the
 * person plainly. It does not lock anyone out: detection is only a hint and can be wrong.
 */
let warned = false;
export async function warnIfDeviceCompromised(): Promise<void> {
  if (warned || __DEV__) return;
  warned = true;
  try {
    const rooted = await Device.isRootedExperimentalAsync();
    if (rooted) {
      showAlert(
        'Your phone may not be secure',
        `This ${Platform.OS === 'ios' ? 'iPhone appears to be jailbroken' : 'Android phone appears to be rooted'}. Other apps could read your PickArena session. Use PickArena on a normal device, and never share your login codes.`,
      );
    }
  } catch { /* detection not available on this device */ }
}
