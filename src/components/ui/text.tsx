import { Text as RNText, type TextProps } from 'react-native';

// Inter: one family per weight (`font-bold` only sets the weight on native, never the family).
// Sizes stay as they were until the UI kit restyle moves them to the mockup type scale.
const variants = {
  title: 'font-inter-bold text-2xl text-content',
  heading: 'font-inter-semibold text-lg text-content',
  body: 'font-inter text-base text-content',
  muted: 'font-inter text-sm text-content-muted',
  error: 'font-inter text-sm text-danger-strong',
} as const;

export type TextVariant = keyof typeof variants;

export function Text({
  variant = 'body',
  className = '',
  ...props
}: TextProps & { variant?: TextVariant; className?: string }) {
  return <RNText className={`${variants[variant]} ${className}`} {...props} />;
}
