import { Pressable, type PressableProps } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import type { ColorToken } from '@/theme/tokens';

import { Text } from './text';

// Height 44 (52 `large`, for the main button on a phone), radius 12. One primary button per screen.
//  - primary: the blue button.   - secondary: white with a blue outline.
//  - danger: red (Sign out).     - ghost: blue text only (Cancel).
const variants = {
  primary: { box: 'bg-primary', text: 'text-primary-content', icon: 'primaryContent' },
  secondary: { box: 'border border-primary bg-surface', text: 'text-primary', icon: 'primary' },
  danger: { box: 'bg-danger', text: 'text-primary-content', icon: 'primaryContent' },
  ghost: { box: 'bg-transparent', text: 'text-primary', icon: 'primary' },
} as const satisfies Record<string, { box: string; text: string; icon: ColorToken }>;

export function Button({
  label,
  variant = 'primary',
  size = 'default',
  icon,
  disabled,
  ...props
}: Omit<PressableProps, 'children'> & { label: string; variant?: keyof typeof variants; size?: 'default' | 'large'; icon?: IconName }) {
  const style = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-button px-4 ${size === 'large' ? 'min-h-[52px]' : 'min-h-11'} ${disabled ? 'bg-border' : `${style.box} active:opacity-80`}`}
      {...props}>
      {icon ? <Icon name={icon} size={size === 'large' ? 20 : 18} color={disabled ? 'contentMuted' : style.icon} /> : null}
      <Text className={`font-inter-semibold ${size === 'large' ? 'text-card' : 'text-body'} ${disabled ? 'text-content-muted' : style.text}`}>{label}</Text>
    </Pressable>
  );
}
