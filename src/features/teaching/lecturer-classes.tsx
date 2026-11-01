import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Screen, Select, Text } from '@/components/ui';
import { slotLabel } from '@/features/sessions/format';
import { useClassSummaries, useSchedules, useSessionTotals, type ClassSummary, type ScheduleOverview } from '@/features/sessions/queries';

function belowText(count: number) {
  return count === 0 ? 'No students below 75%' : `${count} student${count === 1 ? '' : 's'} below 75%`;
}

function ClassCard({
  schedule,
  summary,
  totals,
  previous,
}: {
  schedule: ScheduleOverview;
  summary?: ClassSummary;
  totals?: { held: number; total: number };
  previous: boolean;
}) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={schedule.class_name} onPress={() => router.push(`/class/${schedule.schedule_id}`)}>
      <Card>
        <Text variant="heading">{schedule.class_name}</Text>
        {previous ? (
          <Text variant="muted">
            {schedule.period_name}
            {summary ? ` · ${summary.enrolled} enrolled` : ''}
          </Text>
        ) : (
          <>
            <Text variant="muted">
              {slotLabel(schedule.week_day, schedule.start_time, schedule.end_time)}
              {schedule.location_name ? ` · ${schedule.location_name}` : ''}
            </Text>
            {summary ? (
              <Text variant="muted">
                {summary.enrolled} enrolled{totals ? ` · ${totals.held} of ${totals.total} sessions held` : ''}
              </Text>
            ) : null}
            {summary ? <Text variant="muted">{belowText(Number(summary.students_below_75))}</Text> : null}
          </>
        )}
      </Card>
    </Pressable>
  );
}

// Lecturer Classes: "My classes" for the current period with enrolment, sessions held and who is below 75%,
// and earlier periods' classes. The schedules are the lecturer's own because of row level security.
export function LecturerClasses() {
  const [tab, setTab] = useState<'current' | 'previous'>('current');
  const schedules = useSchedules();
  const ids = (schedules.data ?? []).map((schedule) => schedule.schedule_id);
  const summaries = useClassSummaries(ids);
  const totals = useSessionTotals(ids);

  const shown = (schedules.data ?? []).filter((schedule) => (tab === 'current' ? schedule.period_status !== 'finished' : schedule.period_status === 'finished'));
  const groups = [...new Set(shown.map((schedule) => `${schedule.period_name}|${schedule.period_status}`))];

  return (
    <Screen title="Classes">
      <Select
        label="Show"
        value={tab}
        options={[
          { value: 'current', label: 'My classes' },
          { value: 'previous', label: 'Previous classes' },
        ]}
        onChange={(value) => setTab(value as 'current' | 'previous')}
      />
      {schedules.isPending ? <Text variant="muted">Loading...</Text> : null}
      {schedules.isError ? <Text variant="error">Could not load your classes.</Text> : null}
      {schedules.data && shown.length === 0 ? (
        <Card>
          <Text variant="muted">{tab === 'current' ? 'You are not teaching any current classes.' : 'No previous classes.'}</Text>
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
                <ClassCard
                  key={schedule.schedule_id}
                  schedule={schedule}
                  summary={summaries.data?.get(schedule.schedule_id)}
                  totals={totals.data?.get(schedule.schedule_id)}
                  previous={tab === 'previous'}
                />
              ))}
          </View>
        );
      })}
    </Screen>
  );
}
