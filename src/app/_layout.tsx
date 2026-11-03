import '@/global.css';

import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Screen, Text } from '@/components/ui';
import { AuthProvider, useAuth } from '@/providers/auth';
import { QueryProvider } from '@/providers/query-provider';
import { appTheme } from '@/theme/navigation-theme';

// Keep the splash screen up until Inter is loaded, so text never flashes in the system font.
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  // Wait for the stored session to load so a signed-in person never sees the sign-in screen flash.
  if (status === 'loading') {
    return (
      <Screen standalone title="Attendancely">
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
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  // A font error (offline on web, say) falls back to the system font rather than blocking the app.
  if (!ready) return null;

  return (
    <ThemeProvider value={appTheme}>
      <QueryProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
