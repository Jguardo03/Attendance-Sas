import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Text } from './text';

// The one "waiting for data" line: a small spinner and the words. Screen readers get the words as a polite
// announcement, so the spinner never carries the meaning alone.
export function Loading({ label = 'Loading...' }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-2 py-1" accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={colors.primary} />
      <Text variant="muted">{label}</Text>
    </View>
  );
}
