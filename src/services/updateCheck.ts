import {NativeModules, Platform, Linking} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import AppConfig from '../config';

export interface UpdateCheckResult {
  updateAvailable: boolean;
  storeVersion?: string;
  storeUrl?: string;
}

const PLAY_STORE_URL = `market://details?id=${AppConfig.androidPackage}`;
const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${AppConfig.androidPackage}`;
const APP_STORE_LOOKUP_URL = `https://itunes.apple.com/lookup?bundleId=${AppConfig.bundleId}`;
// Apple's numeric app id (App Store Connect), used as a fallback if a lookup
// response's own trackViewUrl isn't available for some reason.
const APP_STORE_FALLBACK_URL = 'https://apps.apple.com/app/id6812598161';

/**
 * Android: Google Play's official In-App Updates API (see the VaultedUpdate
 * native module) — Play itself decides what "available" means, no version
 * parsing needed.
 * iOS: Apple has no equivalent API, so this queries the public App Store
 * lookup endpoint and compares version strings directly, since Apple doesn't
 * expose a comparable "device-side" API.
 */
export const checkForUpdate = async (): Promise<UpdateCheckResult> => {
  if (Platform.OS === 'android') {
    try {
      const result = await NativeModules.VaultedUpdate.checkForUpdate();
      return {updateAvailable: !!result?.updateAvailable};
    } catch (err) {
      console.warn('[UpdateCheck] Android check failed:', err);
      return {updateAvailable: false};
    }
  }

  if (Platform.OS === 'ios') {
    try {
      const response = await fetch(APP_STORE_LOOKUP_URL);
      const data = await response.json();
      const result = data?.results?.[0];
      const storeVersion: string | undefined = result?.version;
      if (!storeVersion) {
        return {updateAvailable: false};
      }
      const currentVersion = DeviceInfo.getVersion();
      return {
        updateAvailable: isNewerVersion(storeVersion, currentVersion),
        storeVersion,
        storeUrl: result?.trackViewUrl,
      };
    } catch (err) {
      console.warn('[UpdateCheck] iOS check failed:', err);
      return {updateAvailable: false};
    }
  }

  return {updateAvailable: false};
};

export const openStoreListing = (storeUrl?: string) => {
  if (Platform.OS === 'android') {
    Linking.openURL(PLAY_STORE_URL).catch(() => Linking.openURL(PLAY_STORE_WEB_URL));
  } else if (Platform.OS === 'ios') {
    Linking.openURL(storeUrl || APP_STORE_FALLBACK_URL);
  }
};

const isNewerVersion = (storeVersion: string, currentVersion: string): boolean => {
  const store = storeVersion.split('.').map(Number);
  const current = currentVersion.split('.').map(Number);
  const len = Math.max(store.length, current.length);
  for (let i = 0; i < len; i++) {
    const s = store[i] || 0;
    const c = current[i] || 0;
    if (s > c) return true;
    if (s < c) return false;
  }
  return false;
};
