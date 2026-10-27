import '@/global.css';

import { Stack } from 'expo-router';

import { Screen, Text } from '@/components/ui';
import { AuthProvider, useAuth } from '@/providers/auth';
import { QueryProvider } from '@/providers/query-provider';

function RootNavigator() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  // Wait for the stored session to load so a signed-in person never sees the sign-in screen flash.
  if (status === 'loading') {
    return (
      <Screen title="Attendance SAS">
        <Text variant="muted">Loading...</Text>
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn} redirectTo="/sign-in">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="auth-callback" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryProvider>
  );
}
