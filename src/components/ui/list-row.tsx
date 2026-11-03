import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';

import { Text } from './text';

// One row of a list of places to go (the Admin hub): an icon in a tinted square, a title, an optional second line
// and a chevron. Put several in a Card; `last` drops the divider under the final one.
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  last = false,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  trailing?: ReactNode;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      onPress={onPress}
      className={`min-h-14 flex-row items-center gap-3 py-2 active:opacity-80 ${last ? '' : 'border-b border-border'}`}>
      <View className="h-10 w-10 items-center justify-center rounded-block bg-primary-tint">
        <Icon name={icon} size={20} color="primary" />
      </View>
      <View className="flex-1">
        <Text variant="card">{title}</Text>
        {subtitle ? <Text variant="meta">{subtitle}</Text> : null}
      </View>
      {trailing ?? <Icon name="chevronRight" size={20} color="contentMuted" />}
    </Pressable>
  );
}
