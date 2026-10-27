import { Tabs } from 'expo-router';

import { useAuth } from '@/providers/auth';

export default function TabsLayout() {
  const { can } = useAuth();

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => null }} />
      <Tabs.Screen name="classes" options={{ title: 'Classes', tabBarIcon: () => null }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: () => null }} />
      <Tabs.Protected guard={can('admin.access')}>
        <Tabs.Screen name="admin" options={{ title: 'Admin', tabBarIcon: () => null }} />
      </Tabs.Protected>
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => null }} />
    </Tabs>
  );
}
