import { Text as RNText, type TextProps } from 'react-native';

const variants = {
  title: 'text-2xl font-bold text-content',
  heading: 'text-lg font-semibold text-content',
  body: 'text-base text-content',
  muted: 'text-sm text-content-muted',
  error: 'text-sm text-danger',
} as const;

export type TextVariant = keyof typeof variants;

export function Text({
  variant = 'body',
  className = '',
  ...props
}: TextProps & { variant?: TextVariant; className?: string }) {
  return <RNText className={`${variants[variant]} ${className}`} {...props} />;
}
