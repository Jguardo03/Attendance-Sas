import type { ReactNode } from 'react';
import Svg, { Circle, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

// Class cards get abstract shapes in the four brand colours on cream instead of photos (Student UI, style sheet).
// Each class always gets the same one of four patterns, so cards are easy to tell apart.
export const ARTWORK_COUNT = 4;

/** Which of the four patterns a class gets: always the same for the same class. */
export function artworkIndex(classId: number): number {
  return Math.abs(Math.trunc(classId)) % ARTWORK_COUNT;
}

const patterns: ReactNode[] = [
  // 0: blue circle, yellow bar, red pill
  <>
    <Circle cx={46} cy={44} r={22} fill={colors.primary} />
    <Rect x={72} y={30} width={62} height={16} rx={8} fill={colors.warning} transform="rotate(-18 103 38)" />
    <Rect x={38} y={68} width={36} height={14} rx={7} fill={colors.danger} transform="rotate(-10 56 75)" />
  </>,
  // 1: green ring, blue bar, red dot
  <>
    <Circle cx={48} cy={45} r={20} stroke={colors.success} strokeWidth={10} fill="none" />
    <Rect x={98} y={14} width={14} height={60} rx={7} fill={colors.primary} transform="rotate(18 105 44)" />
    <Circle cx={134} cy={68} r={9} fill={colors.danger} />
  </>,
  // 2: yellow rounded square, green bar, blue circle
  <>
    <Rect x={24} y={18} width={52} height={52} rx={14} fill={colors.warning} transform="rotate(-10 50 44)" />
    <Rect x={90} y={62} width={60} height={12} rx={6} fill={colors.success} />
    <Circle cx={122} cy={30} r={15} fill={colors.primary} />
  </>,
  // 3: red circle, blue ring, yellow pill
  <>
    <Circle cx={118} cy={46} r={20} fill={colors.danger} />
    <Circle cx={46} cy={40} r={19} stroke={colors.primary} strokeWidth={10} fill="none" />
    <Rect x={62} y={70} width={50} height={12} rx={6} fill={colors.warning} transform="rotate(8 87 76)" />
    <Circle cx={142} cy={74} r={7} fill={colors.success} />
  </>,
];

/**
 * Fills whatever box it is placed in, never stretched. `crop` (the default) fills the box and trims the edges: good
 * for squares and thumbnails. `whole` shows the entire pattern centred, with cream either side: good for wide, short
 * strips, where cropping would cut the shapes off. Decorative: no label.
 */
export function ClassArtwork({ classId, fit = 'crop' }: { classId: number; fit?: 'crop' | 'whole' }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 90" preserveAspectRatio={fit === 'whole' ? 'xMidYMid meet' : 'xMidYMid slice'}>
      <Rect width={160} height={90} fill={colors.cream} />
      {patterns[artworkIndex(classId)]}
    </Svg>
  );
}
