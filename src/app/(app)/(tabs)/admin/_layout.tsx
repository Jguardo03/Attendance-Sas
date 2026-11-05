import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AdminMenu } from '@/features/admin/components/admin-menu';
import { useIsWide } from '@/features/shell/nav';

// On wide screens the records to manage are a menu beside the main navigation and the chosen one fills the rest.
export default function AdminLayout() {
  const stack = <Stack screenOptions={{ headerShown: false }} />;
  if (!useIsWide()) return stack;
  return (
    <View className="flex-1 flex-row">
      <AdminMenu />
      <View className="flex-1">{stack}</View>
    </View>
  );
}
