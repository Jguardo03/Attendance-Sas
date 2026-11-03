import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/ui';
import { useAuth } from '@/providers/auth';

import { navItems, useIsWide } from './nav';

// The phone's bottom bar: an icon and a label per destination, blue when current. Drawn nothing on wide screens,
// where the sidebar does the job. Pressing a tab works as in the default bar (the tabPress event can be cancelled).
export function BottomTabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const wide = useIsWide();
  const { can } = useAuth();
  if (wide) return null;

  const items = navItems(can);
  const current = state.routes[state.index]?.key;

  return (
    <View className="flex-row border-t border-border bg-surface" style={{ paddingBottom: insets.bottom }} role="tablist">
      {state.routes.map((route) => {
        const item = items.find((candidate) => candidate.key === route.name);
        if (!item) return null;
        const focused = route.key === current;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            className="min-h-16 flex-1 items-center justify-center gap-1 active:opacity-80">
            <Icon name={item.icon} size={24} color={focused ? 'primary' : 'contentMuted'} />
            <Text className={`font-inter-semibold text-label ${focused ? 'text-primary' : 'text-content-muted'}`}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
