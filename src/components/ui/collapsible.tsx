import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { shadows } from '@/theme/tokens';

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
    <View className="gap-2 rounded-card bg-surface p-4" style={{ boxShadow: shadows.card }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        className="min-h-11 flex-row items-center justify-between">
        <Text variant="card">{title}</Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={20} color="contentMuted" />
      </Pressable>
      {open ? <View className="gap-3">{children}</View> : null}
    </View>
  );
}
