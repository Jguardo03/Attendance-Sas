import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from './text';

// A card whose content is hidden until the header is tapped. Closed unless `defaultOpen`.
export function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View className="gap-2 rounded-lg border border-border bg-surface p-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        className="flex-row items-center justify-between">
        <Text variant="heading">{title}</Text>
        <Text variant="muted">{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? <View className="gap-3">{children}</View> : null}
    </View>
  );
}
