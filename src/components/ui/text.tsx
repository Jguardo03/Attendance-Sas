import { Text as RNText, type TextProps } from 'react-native';

// The mockup type scale (Student UI style sheet), in Inter. One family per weight: `font-bold` only sets the weight on
// native, never the family. `heading` is the old name for the section style and is kept so existing screens work.
const variants = {
  title: 'font-inter-bold text-title text-content', // 24 bold: screen titles
  section: 'font-inter-bold text-section text-content', // 17 bold: "Today's sessions"
  heading: 'font-inter-bold text-section text-content',
  card: 'font-inter-semibold text-card text-content', // 15 semibold: card titles, class names
  body: 'font-inter text-body text-content', // 14 regular
  meta: 'font-inter text-meta text-content-muted', // 13 regular: times, rooms, helper text
  muted: 'font-inter text-meta text-content-muted',
  label: 'font-inter-semibold text-label uppercase tracking-wide text-content-muted', // 12 semibold: group labels
  error: 'font-inter text-meta text-danger-strong',
} as const;

export type TextVariant = keyof typeof variants;

export function Text({
  variant = 'body',
  className = '',
  ...props
}: TextProps & { variant?: TextVariant; className?: string }) {
  return <RNText className={`${variants[variant]} ${className}`} {...props} />;
}
