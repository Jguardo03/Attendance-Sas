import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { shadows } from '@/theme/tokens';

import { Badge, type BadgeTone } from './badge';
import { Text } from './text';

// The top of a detail screen (class, session, record): a round back button, the title with an optional second line
// and an optional status pill on the right. The caller decides where Back goes.
export function ScreenHeader({
  title,
  subtitle,
  status,
  onBack,
}: {
  title: string;
  subtitle?: string;
  status?: { label: string; tone: BadgeTone; dot?: boolean };
  onBack?: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-80"
          style={{ boxShadow: shadows.card }}>
          <Icon name="chevronLeft" size={22} color="content" />
        </Pressable>
      ) : null}
      <View className="flex-1">
        <Text variant="section" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text variant="meta">{subtitle}</Text> : null}
      </View>
      {status ? <Badge label={status.label} tone={status.tone} dot={status.dot} /> : null}
    </View>
  );
}
