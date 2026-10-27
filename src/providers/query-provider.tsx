import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { queryClient } from '@/lib/query-client';

// Refetch when the app returns to the foreground (native) and when connectivity comes back.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))),
);

export function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (status: AppStateStatus) =>
      focusManager.setFocused(status === 'active'),
    );
    return () => sub.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
