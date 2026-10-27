import { Pressable, type PressableProps } from 'react-native';

import { Text } from './text';

export function Button({
  label,
  disabled,
  ...props
}: Omit<PressableProps, 'children'> & { label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      className={`items-center rounded-md px-4 py-3 ${disabled ? 'bg-border' : 'bg-primary'}`}
      {...props}>
      <Text className={disabled ? 'text-content-muted' : 'text-primary-content'}>{label}</Text>
    </Pressable>
  );
}
