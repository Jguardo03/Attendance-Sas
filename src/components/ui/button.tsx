import { Pressable, type PressableProps } from 'react-native';

import { Text } from './text';

const variants = {
  primary: { box: 'bg-primary', text: 'text-primary-content' },
  secondary: { box: 'border border-border bg-surface', text: 'text-content' },
  danger: { box: 'bg-danger', text: 'text-primary-content' },
} as const;

export function Button({
  label,
  variant = 'primary',
  disabled,
  ...props
}: Omit<PressableProps, 'children'> & { label: string; variant?: keyof typeof variants }) {
  const style = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      className={`items-center rounded-md px-4 py-3 ${disabled ? 'bg-border' : style.box}`}
      {...props}>
      <Text className={disabled ? 'text-content-muted' : style.text}>{label}</Text>
    </Pressable>
  );
}
