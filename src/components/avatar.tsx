import { View } from 'react-native';

import { Text } from '@/components/ui';
import { avatarTone, initials } from '@/lib/initials';

// Each pair is a tint and the text colour that passes 4.5:1 on it (checked in theme.test.ts).
// Class names are written out in full so the styling tool can see them.
const tones = [
  { box: 'bg-primary-tint', text: 'text-primary' },
  { box: 'bg-success-tint', text: 'text-success-strong' },
  { box: 'bg-warning-tint', text: 'text-warning-content' },
  { box: 'bg-danger-tint', text: 'text-danger-strong' },
  { box: 'bg-cream', text: 'text-content' },
] as const;

/** Initials in a tinted circle. `id` (a student or staff id) keeps a person's colour the same everywhere. */
export function Avatar({ name, id, size = 40 }: { name: string; id?: string; size?: number }) {
  const tone = tones[avatarTone(id ?? name)];
  return (
    <View
      className={`items-center justify-center rounded-full ${tone.box}`}
      style={{ width: size, height: size }}
      aria-hidden>
      <Text className={`font-inter-semibold ${tone.text}`} style={{ fontSize: Math.max(11, Math.round(size * 0.36)) }}>
        {initials(name)}
      </Text>
    </View>
  );
}
