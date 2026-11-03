import { View } from 'react-native';

import { BreakdownRing } from '@/components/charts';
import { Card, Text } from '@/components/ui';
import type { AttendanceNumbers } from '@/features/sessions/queries';
import { colors } from '@/theme/tokens';

/** Adds up a student's numbers over every class. The per-class figures come from the database. */
export function totalsOf(numbers: Iterable<AttendanceNumbers> | undefined): { present: number; late: number; absent: number; finished: number } {
  const total = { present: 0, late: 0, absent: 0, finished: 0 };
  for (const row of numbers ?? []) {
    total.present += Number(row.present);
    total.late += Number(row.late);
    total.absent += Number(row.absent);
    total.finished += Number(row.finished_sessions);
  }
  return total;
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View className="flex-row items-center gap-1.5" accessibilityLabel={`${label}: ${value}`} accessible>
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <Text variant="meta">
        {label} {value}
      </Text>
    </View>
  );
}

// "My attendance": the donut over all the student's classes with the counts beside it (Student UI, Home).
export function AttendanceSummary({ numbers }: { numbers: Iterable<AttendanceNumbers> | undefined }) {
  const total = totalsOf(numbers);
  return (
    <Card>
      <View className="flex-row items-center gap-4">
        <BreakdownRing present={total.present} late={total.late} absent={total.absent} size={88} strokeWidth={9} />
        <View className="flex-1 gap-1">
          <Text variant="card">My attendance</Text>
          <Text variant="meta">{total.finished === 0 ? 'No finished sessions yet' : `${total.finished} finished sessions`}</Text>
          <View className="flex-row flex-wrap gap-x-3 gap-y-1">
            <Legend color={colors.success} label="Present" value={total.present} />
            <Legend color={colors.warning} label="Late" value={total.late} />
            <Legend color={colors.danger} label="Absent" value={total.absent} />
          </View>
        </View>
      </View>
    </Card>
  );
}
