import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppMark } from '@/components/app-mark';
import { Badge, Text } from '@/components/ui';
import { useIsWide } from '@/features/shell/nav';
import { colors } from '@/theme/tokens';

// The frame around the sign-in screens (Student UI pages 2 to 7). A phone shows the mark, the name and the form in a
// column. A wide screen adds a blue panel on the left with the product line, as in the desktop mockup.
function HeroPanel() {
  return (
    <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 56, justifyContent: 'center', gap: 20 }}>
      <AppMark size={64} variant="plain" label={null} />
      <Text className="font-inter-bold text-primary-content" style={{ fontSize: 36, lineHeight: 44 }}>
        Check in to class in seconds.
      </Text>
      <Text className="text-primary-content" style={{ fontSize: 16, lineHeight: 24 }}>
        Your phone finds the room for you. No paper lists, no queues.
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Badge label="Present" tone="success" dot />
        <Badge label="Late" tone="warning" dot />
        <Badge label="Live" tone="upcoming" dot />
      </View>
    </LinearGradient>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  const wide = useIsWide();
  const insets = useSafeAreaInsets();

  const form = (
    <ScrollView
      className="flex-1 bg-surface-muted"
      contentContainerClassName="flex-grow items-center justify-center px-5"
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled">
      <View className="w-full max-w-[420px] gap-5">
        <View className="items-center gap-2">
          <AppMark size={56} />
          <Text variant="section">Attendancely</Text>
        </View>
        {children}
      </View>
    </ScrollView>
  );

  if (!wide) return form;
  return (
    <View className="flex-1 flex-row">
      <View className="flex-1">
        <HeroPanel />
      </View>
      <View className="flex-1">{form}</View>
    </View>
  );
}
