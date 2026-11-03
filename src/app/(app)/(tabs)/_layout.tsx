import { Tabs } from 'expo-router';

import { BottomTabBar } from '@/features/shell/bottom-tab-bar';
import { useAuth } from '@/providers/auth';

// Every tab screen is declared (SDK 58 shows only declared ones). The bar itself is ours: icons and labels on a phone,
// nothing on wide screens, where the sidebar in the (app) layout takes over.
export default function TabsLayout() {
  const { can } = useAuth();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="classes" options={{ title: 'Classes' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Protected guard={can('admin.access')}>
        <Tabs.Screen name="admin" options={{ title: 'Admin' }} />
      </Tabs.Protected>
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
