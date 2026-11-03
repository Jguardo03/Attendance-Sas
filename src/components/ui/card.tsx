import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors, radii, shadows } from '@/theme/tokens';

import { Text } from './text';

// White card, radius 20, soft shadow (Student UI style sheet).
//  - default: the normal card.
//  - flat: a smaller block inside a card (radius 14, a hairline instead of a shadow).
//  - hero: the blue gradient banner at the top of a screen (Live now, class attendance); put white text in it.
type Variant = 'default' | 'flat' | 'hero';

export function Card({ title, variant = 'default', children }: { title?: string; variant?: Variant; children?: ReactNode }) {
  if (variant === 'hero') {
    return (
      <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radii.card, padding: 20, gap: 8 }}>
        {title ? <Text variant="card" className="text-primary-content">{title}</Text> : null}
        {children}
      </LinearGradient>
    );
  }
  if (variant === 'flat') {
    return (
      <View className="gap-2 rounded-block border border-border bg-surface p-3">
        {title ? <Text variant="card">{title}</Text> : null}
        {children}
      </View>
    );
  }
  return (
    <View className="gap-2 rounded-card bg-surface p-4" style={{ boxShadow: shadows.card }}>
      {title ? <Text variant="card">{title}</Text> : null}
      {children}
    </View>
  );
}
