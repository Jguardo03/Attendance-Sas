import { TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/theme/tokens';

import { fieldBorder } from './field';
import { Text } from './text';

export function TextField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="gap-1">
      <Text variant="meta" className="font-inter-medium">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.contentMuted}
        textAlignVertical={props.multiline ? 'top' : 'center'}
        className={`rounded-button border bg-surface px-3 font-inter text-body text-content focus:border-primary ${props.multiline ? 'min-h-24 py-3' : 'min-h-11 py-2.5'} ${fieldBorder(error)}`}
        {...props}
      />
      {error ? <Text variant="error">{error}</Text> : null}
    </View>
  );
}
