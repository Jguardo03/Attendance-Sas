import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './text';

export function TextField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="gap-1">
      <Text variant="muted">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        className="rounded-md border border-border bg-surface px-3 py-3 text-base text-content"
        {...props}
      />
      {error ? <Text variant="error">{error}</Text> : null}
    </View>
  );
}
