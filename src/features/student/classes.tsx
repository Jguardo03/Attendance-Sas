import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Screen, Select, Text } from '@/components/ui';
import { slotLabel } from '@/features/sessions/format';
import { useSchedules, useStudentOverview, type AttendanceNumbers, type ScheduleOverview } from '@/features/sessions/queries';
import { useAuth } from '@/providers/auth';

function attendanceText(numbers: AttendanceNumbers | undefined, previous: boolean) {
  if (!numbers || numbers.attendance_pct === null) return 'No finished sessions yet';
  return `${previous ? 'Attendance' : 'My attendance'} ${Math.round(Number(numbers.attendance_pct))}%`;
}

function ClassCard({ schedule, numbers, previous }: { schedule: ScheduleOverview; numbers?: AttendanceNumbers; previous: boolean }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={schedule.class_name} onPress={() => router.push(`/class/${schedule.schedule_id}`)}>
      <Card>
        <Text variant="heading">{schedule.class_name}</Text>
        {previous ? (
          <Text variant="muted">{schedule.period_name}</Text>
        ) : (
          <Text variant="muted">
            {slotLabel(schedule.week_day, schedule.start_time, schedule.end_time)}
            {schedule.location_name ? ` · ${schedule.location_name}` : ''}
          </Text>
        )}
        <Text variant="muted">
          {schedule.lecturer_first_name} {schedule.lecturer_last_name}
        </Text>
        <Text variant="muted">{attendanceText(numbers, previous)}</Text>
      </Card>
    </Pressable>
  );
}

// Student Classes: the current period's classes, and earlier periods' classes with their final attendance.
export function StudentClasses() {
  const { claims } = useAuth();
  const [tab, setTab] = useState<'current' | 'previous'>('current');
  const schedules = useSchedules();
  const numbers = useStudentOverview(claims?.appUserId);

  const current = (schedules.data ?? []).filter((schedule) => schedule.period_status !== 'finished');
  const previous = (schedules.data ?? []).filter((schedule) => schedule.period_status === 'finished');
  const shown = tab === 'current' ? current : previous;

  // Group by period so each heading reads "2026 Term 4 (active)".
  const groups = [...new Set(shown.map((schedule) => `${schedule.period_name}|${schedule.period_status}`))];

  return (
    <Screen title="Classes">
      <Select
        label="Show"
        value={tab}
        options={[
          { value: 'current', label: 'Current' },
          { value: 'previous', label: 'Previous' },
        ]}
        onChange={(value) => setTab(value as 'current' | 'previous')}
      />
      {schedules.isPending ? <Text variant="muted">Loading...</Text> : null}
      {schedules.isError ? <Text variant="error">Could not load your classes.</Text> : null}
      {schedules.data && shown.length === 0 ? (
        <Card>
          <Text variant="muted">{tab === 'current' ? 'You are not enrolled in any current classes.' : 'No previous classes.'}</Text>
        </Card>
      ) : null}
      {groups.map((group) => {
        const [period, status] = group.split('|');
        return (
          <View key={group} className="gap-3">
            {tab === 'current' ? <Text variant="heading">{`${period} (${status})`}</Text> : null}
            {shown
              .filter((schedule) => `${schedule.period_name}|${schedule.period_status}` === group)
              .map((schedule) => (
                <ClassCard key={schedule.schedule_id} schedule={schedule} numbers={numbers.data?.get(schedule.schedule_id)} previous={tab === 'previous'} />
              ))}
          </View>
        );
      })}
    </Screen>
  );
}
