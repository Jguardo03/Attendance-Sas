import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

// The Attendancely mark: a tick with a beacon signal (the same drawing as assets/images/icon.png, on a 100 unit grid).
//  - `tile`: white tick on the blue rounded square, like the app icon (sign-in, sidebar).
//  - `plain`: white tick on a transparent background, for use on a blue banner.
//  - `brand`: blue tick on a transparent background, for use on white.
// The beacon arc is always the late-yellow. The accessibility props sit on a wrapping View, because on web the SVG
// element would pass them to the page as unknown attributes.
type Variant = 'tile' | 'plain' | 'brand';

export function AppMark({ size = 40, variant = 'tile', label = 'Attendancely' }: { size?: number; variant?: Variant; label?: string | null }) {
  const tick = variant === 'brand' ? colors.primary : colors.primaryContent;
  return (
    <View
      style={{ width: size, height: size }}
      accessible={label !== null}
      accessibilityRole={label === null ? undefined : 'image'}
      accessibilityLabel={label ?? undefined}
      aria-hidden={label === null ? true : undefined}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {variant === 'tile' ? <Rect width={100} height={100} rx={22} fill={colors.primary} /> : null}
        <Path d="M26.6 57.8 L39.5 70.8 L65.2 43.2" stroke={tick} strokeWidth={7.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M63.7 28.9 A20 20 0 0 1 73.2 38.6" stroke={colors.warning} strokeWidth={7.6} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}
