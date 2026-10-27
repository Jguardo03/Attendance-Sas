import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from './text';

export function Card({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <View className="gap-2 rounded-lg border border-border bg-surface p-4">
      {title ? <Text variant="heading">{title}</Text> : null}
      {children}
    </View>
  );
}
