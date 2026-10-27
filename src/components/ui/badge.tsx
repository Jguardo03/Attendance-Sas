import { View } from 'react-native';

import { Text } from './text';

const tones = {
  neutral: 'bg-surface-muted',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  danger: 'bg-danger/15',
} as const;

// Always shows text, so status never relies on color alone.
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof tones }) {
  return (
    <View className={`self-start rounded-full px-3 py-1 ${tones[tone]}`}>
      <Text variant="muted">{label}</Text>
    </View>
  );
}
