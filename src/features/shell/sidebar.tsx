import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppMark } from '@/components/app-mark';
import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/ui';
import { useAuth } from '@/providers/auth';

import { isActive, navItems, type NavItem } from './nav';
import { SignOutConfirm } from './sign-out-confirm';

export function Row({ icon, label, active = false, danger = false, onPress }: { icon: IconName; label: string; active?: boolean; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-11 flex-row items-center gap-3 rounded-block px-3 active:opacity-80 ${active ? 'bg-primary-tint' : ''}`}>
      {active ? <View className="absolute bottom-2 left-0 top-2 w-1 rounded-full bg-primary" aria-hidden /> : null}
      <Icon name={icon} size={20} color={danger ? 'dangerStrong' : active ? 'primary' : 'contentMuted'} />
      <Text className={`font-inter-medium ${danger ? 'text-danger-strong' : active ? 'text-primary' : 'text-content'}`}>{label}</Text>
    </Pressable>
  );
}

// The left navigation on wide screens: the app mark, an OVERVIEW group, and an ACCOUNT group with Sign out
// (which asks first). It wraps every signed-in screen, so it stays put while pages change.
export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { can } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const items = navItems(can);
  const rows = (group: NavItem['group']) =>
    items
      .filter((item) => item.group === group)
      .map((item) => <Row key={item.key} icon={item.icon} label={item.label} active={isActive(item, pathname)} onPress={() => router.push(item.href)} />);

  return (
    <View className="w-60 gap-1 border-r border-border bg-surface px-3 py-5" role="navigation" accessibilityLabel="Main">
      <View className="mb-4 flex-row items-center gap-3 px-3">
        <AppMark size={36} />
        <Text variant="section">Attendancely</Text>
      </View>

      <Text variant="label" className="mb-1 px-3">
        Overview
      </Text>
      {rows('overview')}

      <View className="flex-1" />

      <Text variant="label" className="mb-1 px-3">
        Account
      </Text>
      {rows('account')}
      <Row icon="signOut" label="Sign out" danger onPress={() => setConfirming((value) => !value)} />
      {confirming ? <SignOutConfirm onCancel={() => setConfirming(false)} /> : null}
    </View>
  );
}
