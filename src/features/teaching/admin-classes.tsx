import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Dropdown, Screen, Text } from '@/components/ui';
import { slotLabel } from '@/features/sessions/format';
import { useClassSummaries, useSchedules } from '@/features/sessions/queries';

const choices = (values: string[]) => [{ value: '', label: 'All' }, ...values.map((value) => ({ value, label: value }))];
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();

// Admin Classes: every class in a period with lecturer, schedule, enrolment, class average and how many students
// are below 75%. Opens on the active period; change Period to see others.
export function AdminClasses() {
  const router = useRouter();
  const schedules = useSchedules();
  const all = schedules.data ?? [];
  const [chosen, setChosen] = useState<{ period?: string; class_name?: string; lecturer?: string }>({});

  // Default to the active period until the person picks one ('' means all periods).
  const activePeriod = all.find((schedule) => schedule.period_status === 'active')?.period_name ?? '';
  const period = chosen.period === undefined ? activePeriod : chosen.period;
  const lecturerOf = (schedule: (typeof all)[number]) => `${schedule.lecturer_first_name ?? ''} ${schedule.lecturer_last_name ?? ''}`.trim();

  const shown = all.filter(
    (schedule) =>
      (!period || schedule.period_name === period) &&
      (!chosen.class_name || schedule.class_name === chosen.class_name) &&
      (!chosen.lecturer || lecturerOf(schedule) === chosen.lecturer),
  );
  const summaries = useClassSummaries(shown.map((schedule) => schedule.schedule_id));
  const below = shown.reduce((sum, schedule) => sum + Number(summaries.data?.get(schedule.schedule_id)?.students_below_75 ?? 0), 0);

  return (
    <Screen title="Classes">
      <Dropdown label="Period" value={period} options={choices(unique(all.map((schedule) => schedule.period_name)))} onChange={(value) => setChosen((c) => ({ ...c, period: value }))} />
      <Dropdown label="Class" value={chosen.class_name ?? ''} options={choices(unique(all.map((schedule) => schedule.class_name)))} onChange={(value) => setChosen((c) => ({ ...c, class_name: value || undefined }))} />
      <Dropdown label="Lecturer" value={chosen.lecturer ?? ''} options={choices(unique(all.map(lecturerOf)))} onChange={(value) => setChosen((c) => ({ ...c, lecturer: value || undefined }))} />
      {chosen.class_name || chosen.lecturer || chosen.period !== undefined ? <Button variant="secondary" label="Reset filters" onPress={() => setChosen({})} /> : null}

      <Text variant="heading">{`${shown.length} class${shown.length === 1 ? '' : 'es'}${period ? ` in ${period}` : ''}`}</Text>
      {summaries.data ? <Text variant="muted">{below} students below 75% in total</Text> : null}
      {schedules.isPending ? <Text variant="muted">Loading...</Text> : null}
      {schedules.isError ? <Text variant="error">Could not load classes.</Text> : null}
      {schedules.data && shown.length === 0 ? (
        <Card>
          <Text variant="muted">No classes match.</Text>
        </Card>
      ) : null}
      <View className="gap-3">
        {shown.map((schedule) => {
          const summary = summaries.data?.get(schedule.schedule_id);
          return (
            <Pressable key={schedule.schedule_id} accessibilityRole="link" accessibilityLabel={schedule.class_name} onPress={() => router.push(`/class/${schedule.schedule_id}`)}>
              <Card>
                <Text variant="heading">{schedule.class_name}</Text>
                <Text variant="muted">
                  {lecturerOf(schedule)} · {slotLabel(schedule.week_day, schedule.start_time, schedule.end_time)}
                </Text>
                {summary ? (
                  <Text variant="muted">
                    {summary.enrolled} enrolled · {summary.class_average_pct === null ? 'no average yet' : `${Math.round(Number(summary.class_average_pct))}% avg`} · {Number(summary.students_below_75)} below 75%
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
