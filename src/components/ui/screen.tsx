import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { Text } from './text';

export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <ScrollView
      className="flex-1 bg-surface-muted"
      contentContainerClassName="mx-auto w-full max-w-3xl gap-4 p-4">
      <Text variant="title">{title}</Text>
      {children}
    </ScrollView>
  );
}
