import { Stack } from 'expo-router';

import { useDevicePermissionsPrompt } from '@/lib/device-permissions';

export default function AppLayout() {
  const { loading, pending } = useDevicePermissionsPrompt();
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!pending} redirectTo="/device-permissions">
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={pending} redirectTo="/">
        <Stack.Screen name="device-permissions" />
      </Stack.Protected>
    </Stack>
  );
}
