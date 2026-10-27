import { Tabs } from 'expo-router';

// Placeholder shell. Phase 4 swaps this for role-aware tabs (Tabs.Protected) and adds Admin.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => null }} />
      <Tabs.Screen name="classes" options={{ title: 'Classes', tabBarIcon: () => null }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: () => null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => null }} />
    </Tabs>
  );
}
