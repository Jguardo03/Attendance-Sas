import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useIsWide } from './nav';
import { Sidebar } from './sidebar';
import { UserChip } from './user-chip';

// On wide screens: the sidebar on the left, a thin top bar with the user chip, and the page below it. On phones the
// page is shown as it is (the bottom tab bar belongs to the tabs layout). `enabled` is false while the first-launch
// permissions screen is showing, so nobody can wander off it.
export function AppShell({ enabled = true, children }: { enabled?: boolean; children: ReactNode }) {
  const wide = useIsWide();
  if (!wide || !enabled) return <>{children}</>;

  return (
    <View className="flex-1 flex-row bg-surface-muted">
      <Sidebar />
      <View className="flex-1">
        <View className="h-16 flex-row items-center justify-end border-b border-border bg-surface px-6">
          <UserChip />
        </View>
        <View className="flex-1">{children}</View>
      </View>
    </View>
  );
}
