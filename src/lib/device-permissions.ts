import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/providers/auth';

// First-launch device permissions screen: native students only (they are the ones who check in).
// Gated by the check-in permission, not by role name. Web has no Bluetooth/NFC prompts to explain.
export function useDevicePermissionsPrompt() {
  const { can, claims } = useAuth();
  const eligible = Platform.OS !== 'web' && can('attendance.check_in');
  const storageKey = `device-permissions-seen:${claims?.appUserId ?? 'unknown'}`;
  // null until the stored flag has been read. Ineligible people never need the screen.
  const [stored, setStored] = useState<boolean | null>(null);
  const seen = eligible ? stored : true;

  useEffect(() => {
    if (!eligible) return;
    AsyncStorage.getItem(storageKey)
      .then((value) => setStored(value === '1'))
      .catch(() => setStored(true));
  }, [eligible, storageKey]);

  const markSeen = useCallback(async () => {
    setStored(true);
    await AsyncStorage.setItem(storageKey, '1').catch(() => undefined);
  }, [storageKey]);

  return { loading: seen === null, pending: seen === false, markSeen };
}
