import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui';
import { barPercent, ringDash, ringSegments, ringTone, type RingCounts } from '@/lib/ring';
import { colors } from '@/theme/tokens';

const toneColor = { success: colors.success, danger: colors.danger, neutral: colors.border } as const;

/**
 * A donut with the percentage in the middle: green from 75% up, red below, grey when there is nothing yet.
 * The number is passed in (it comes from the database); this only draws it.
 */
export function ProgressRing({
  value,
  size = 56,
  strokeWidth = 6,
  label = 'Attendance',
}: {
  value: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const { dash, gap } = ringDash(radius, value ?? 0);
  const rounded = value === null ? null : Math.round(value);

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={rounded === null ? `${label}: no sessions yet` : `${label}: ${rounded}%`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        {dash > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={toneColor[ringTone(value)]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View className="absolute inset-0 items-center justify-center" accessible={false}>
        <Text className="font-inter-bold" style={{ fontSize: Math.max(10, Math.round(size * (rounded !== null && rounded >= 100 ? 0.22 : 0.27))) }}>
          {rounded === null ? '-' : `${rounded}%`}
        </Text>
      </View>
    </View>
  );
}

const segmentColor = { present: colors.success, late: colors.warning, absent: colors.danger } as const;

/** A donut split into present, late and absent, with the share attended in the middle ("89% overall"). */
export function BreakdownRing({ present, late, absent, size = 96, strokeWidth = 10, caption = 'overall' }: RingCounts & { size?: number; strokeWidth?: number; caption?: string }) {
  const radius = (size - strokeWidth) / 2;
  const { total, attendedPercent, segments } = ringSegments({ present, late, absent }, radius);

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={total === 0 ? 'No sessions yet' : `${attendedPercent}% attended: ${present} present, ${late} late, ${absent} absent`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        {segments.map((segment) => (
          <Circle
            key={segment.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segmentColor[segment.key]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segment.dash} ${segment.gap}`}
            strokeDashoffset={segment.offset}
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
      </Svg>
      <View className="absolute inset-0 items-center justify-center" accessible={false}>
        <Text className="font-inter-bold" style={{ fontSize: Math.max(12, Math.round(size * 0.22)) }}>
          {attendedPercent === null ? '-' : `${attendedPercent}%`}
        </Text>
        <Text variant="muted" style={{ fontSize: Math.max(10, Math.round(size * 0.12)) }}>
          {caption}
        </Text>
      </View>
    </View>
  );
}

// Written out in full so the styling tool can see the class names.
const barFill = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', primary: 'bg-primary' } as const;

/** A thin bar for tables and cards ("18/24"). `value` of `max` is filled; the numbers are shown by the caller. */
export function ProgressBar({ value, max, tone = 'success', label }: { value: number; max: number; tone?: keyof typeof barFill; label?: string }) {
  const percent = barPercent(value, max);
  return (
    <View
      className="h-1.5 overflow-hidden rounded-full bg-border"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Progress'}
      accessibilityValue={{ min: 0, max: Math.max(max, 0), now: Math.min(Math.max(value, 0), Math.max(max, 0)) }}>
      <View className={`h-full rounded-full ${barFill[tone]}`} style={{ width: `${percent}%` }} />
    </View>
  );
}
