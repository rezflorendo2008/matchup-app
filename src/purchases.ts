import { Platform } from 'react-native';
import { RC } from './config';

let configured = false;
const lib = (): any => { try { return require('react-native-purchases').default ?? require('react-native-purchases'); } catch { return null; } };

export const purchasesAvailable = () => !!(Platform.OS === 'ios' ? RC.ios : RC.android);

/** Safe to call repeatedly. Returns false in Expo Go / when no RevenueCat key is set. */
export async function setupPurchases(userId: number): Promise<boolean> {
  try {
    const key = Platform.OS === 'ios' ? RC.ios : RC.android;
    const P = lib();
    if (!key || !P) return false;
    if (!configured) { P.configure({ apiKey: key, appUserID: String(userId) }); configured = true; }
    else await P.logIn(String(userId));
    return true;
  } catch (e) { console.warn('Purchases unavailable:', e); return false; }
}

export async function buyProduct(productId: string): Promise<void> {
  const P = lib();
  if (!P) throw new Error('In-app purchases are not available in this build.');
  const offerings = await P.getOfferings();
  const pkgs: any[] = Object.values(offerings.all ?? {}).flatMap((o: any) => o.availablePackages ?? []);
  const pkg = pkgs.find((p) => p.product?.identifier === productId || p.identifier === productId);
  if (!pkg) throw new Error('This plan is not available in the store yet.');
  await P.purchasePackage(pkg);
}

export async function restorePurchases(): Promise<void> {
  const P = lib();
  if (!P) throw new Error('In-app purchases are not available in this build.');
  await P.restorePurchases();
}
