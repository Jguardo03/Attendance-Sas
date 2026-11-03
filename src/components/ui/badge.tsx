import { Text as RNText, View } from 'react-native';

// A status pill. Always shows text, so status never relies on colour alone (colour supports the word).
//  - Attendance and general: neutral, success (Present), warning (Late), danger (Absent).
//  - Session: live (solid blue), upcoming (blue tint), rescheduled (cream), cancelled (grey, struck through).
// The text colours are the "strong" variants that pass 4.5:1 on their tint (checked in theme.test.ts).
// Class names are written out in full so the styling tool can see them.
const tones = {
  neutral: { box: 'bg-surface-muted', text: 'text-content-muted', dot: 'bg-content-muted' },
  success: { box: 'bg-success-tint', text: 'text-success-strong', dot: 'bg-success' },
  warning: { box: 'bg-warning-tint', text: 'text-warning-content', dot: 'bg-warning' },
  danger: { box: 'bg-danger-tint', text: 'text-danger-strong', dot: 'bg-danger' },
  live: { box: 'bg-primary', text: 'text-primary-content', dot: 'bg-primary-content' },
  upcoming: { box: 'bg-primary-tint', text: 'text-primary', dot: 'bg-primary' },
  rescheduled: { box: 'bg-cream', text: 'text-content', dot: 'bg-warning' },
  cancelled: { box: 'bg-surface-muted', text: 'text-content-muted line-through', dot: 'bg-content-muted' },
} as const;

export type BadgeTone = keyof typeof tones;

/** `dot` adds the small round marker the mockups show on attendance and Live pills. */
export function Badge({ label, tone = 'neutral', dot = false }: { label: string; tone?: BadgeTone; dot?: boolean }) {
  const style = tones[tone];
  return (
    <View className={`flex-row items-center gap-1.5 self-start rounded-full px-3 py-1 ${style.box}`}>
      {dot ? <View className={`h-1.5 w-1.5 rounded-full ${style.dot}`} accessible={false} aria-hidden /> : null}
      <RNText className={`font-inter-semibold text-label ${style.text}`}>{label}</RNText>
    </View>
  );
}
