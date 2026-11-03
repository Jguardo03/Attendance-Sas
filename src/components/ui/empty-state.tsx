import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';

import { Button } from './button';
import { Text } from './text';

// What a list shows when it has nothing: a friendly icon, one short title, one helpful line, one action.
export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center gap-3 px-4 py-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-tint">
        <Icon name={icon} size={30} color="primary" />
      </View>
      <Text variant="section" className="text-center">
        {title}
      </Text>
      <Text variant="meta" className="text-center">
        {message}
      </Text>
      {actionLabel && onAction ? <Button variant="secondary" label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
