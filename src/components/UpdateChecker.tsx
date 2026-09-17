import {useEffect} from 'react';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {checkForUpdate, openStoreListing} from '../services/updateCheck';

const DISMISSED_VERSION_KEY = 'update_prompt_dismissed_version';

/**
 * Dismissible "update available" prompt, checked once per app launch.
 * Renders nothing — mount once near the app root (see App.tsx).
 */
const UpdateChecker = () => {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const result = await checkForUpdate();
      if (cancelled || !result.updateAvailable) return;

      const versionKey = result.storeVersion || 'available';
      const dismissedVersion = await AsyncStorage.getItem(DISMISSED_VERSION_KEY);
      if (dismissedVersion === versionKey) return;

      Alert.alert(
        'Update Available',
        'A new version of Vaulted is available. Update now for the latest features and fixes.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => AsyncStorage.setItem(DISMISSED_VERSION_KEY, versionKey),
          },
          {
            text: 'Update',
            onPress: () => openStoreListing(result.storeUrl),
          },
        ],
      );
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};

export default UpdateChecker;
