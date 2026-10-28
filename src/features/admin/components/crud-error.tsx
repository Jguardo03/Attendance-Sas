import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import type { FriendlyError } from '@/lib/db-errors';

// The one error component for every Admin save or delete the database rejects (Admin wireframes).
export function CrudError({
  error,
  onAction,
  onDismiss,
}: {
  error: FriendlyError;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      className="gap-2 rounded-lg border border-danger bg-danger/10 p-4">
      <View className="flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-full border border-danger">
          <Text variant="error">!</Text>
        </View>
        <Text variant="heading" className="flex-1">
          {error.title}
        </Text>
      </View>
      <Text>{error.message}</Text>
      {error.conflict ? <Text variant="muted">Conflicts with: {error.conflict}</Text> : null}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button label={error.actionLabel} onPress={onAction} />
        </View>
        <View className="flex-1">
          <Button variant="secondary" label="Dismiss" onPress={onDismiss} />
        </View>
      </View>
    </View>
  );
}
