import { Stack } from 'expo-router';

import { useDevicePermissionsPrompt } from '@/lib/device-permissions';

export default function AppLayout() {
  const { loading, pending } = useDevicePermissionsPrompt();
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!pending} redirectTo="/device-permissions">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session/[id]" />
        <Stack.Screen name="class/[id]" />
        <Stack.Screen name="check-in/[id]" />
        <Stack.Screen name="room-qr" />
        <Stack.Screen name="attendance/[sessionId]/[studentId]" />
        <Stack.Screen name="student/[id]" />
        <Stack.Screen name="reports" />
      </Stack.Protected>
      {/* Development only: the UI gallery (a closed guard in production builds). */}
      <Stack.Protected guard={__DEV__ && !pending}>
        <Stack.Screen name="dev/ui" />
      </Stack.Protected>
      <Stack.Protected guard={pending} redirectTo="/">
        <Stack.Screen name="device-permissions" />
      </Stack.Protected>
    </Stack>
  );
}
