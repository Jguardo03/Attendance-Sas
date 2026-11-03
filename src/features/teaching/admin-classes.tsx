import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ProgressRing } from '@/components/charts';
import { Button, Card, Collapsible, Dropdown, EmptyState, Grid, Screen, Text, TextField } from '@/components/ui';
import { slotLabel } from '@/features/sessions/format';
import { useClassSummaries, useSchedules } from '@/features/sessions/queries';
import { shadows } from '@/theme/tokens';

const choices = (values: string[]) => [{ value: '', label: 'All' }, ...values.map((value) => ({ value, label: value }))];
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();

// Admin Classes: every class in a period with lecturer, schedule, enrolment, class average and how many students
// are below 75%. Opens on the active period; change Period to see others.
export function AdminClasses() {
  const router = useRouter();
  const schedules = useSchedules();
  const all = schedules.data ?? [];
  const [chosen, setChosen] = useState<{ period?: string; class_name?: string; lecturer?: string }>({});
  const [search, setSearch] = useState('');

  // Default to the active period until the person picks one ('' means all periods).
  const activePeriod = all.find((schedule) => schedule.period_status === 'active')?.period_name ?? '';
  const period = chosen.period === undefined ? activePeriod : chosen.period;
  const lecturerOf = (schedule: (typeof all)[number]) => `${schedule.lecturer_first_name ?? ''} ${schedule.lecturer_last_name ?? ''}`.trim();

  const shown = all.filter(
    (schedule) =>
      (!period || schedule.period_name === period) &&
      (!chosen.class_name || schedule.class_name === chosen.class_name) &&
      (!search.trim() || schedule.class_name.toLowerCase().includes(search.trim().toLowerCase())) &&
      (!chosen.lecturer || lecturerOf(schedule) === chosen.lecturer),
  );
  const summaries = useClassSummaries(shown.map((schedule) => schedule.schedule_id));
  const below = shown.reduce((sum, schedule) => sum + Number(summaries.data?.get(schedule.schedule_id)?.students_below_75 ?? 0), 0);

  return (
    <Screen title="Classes">
      <TextField label="Search class" value={search} onChangeText={setSearch} placeholder="Search class name" autoCapitalize="none" />
      <Collapsible title={chosen.class_name || chosen.lecturer ? `Filters (${[chosen.class_name, chosen.lecturer].filter(Boolean).length})` : 'Filters'}>
        <Dropdown label="Period" value={period} options={choices(unique(all.map((schedule) => schedule.period_name)))} onChange={(value) => setChosen((c) => ({ ...c, period: value }))} />
        <Dropdown label="Class" value={chosen.class_name ?? ''} options={choices(unique(all.map((schedule) => schedule.class_name)))} onChange={(value) => setChosen((c) => ({ ...c, class_name: value || undefined }))} />
        <Dropdown label="Lecturer" value={chosen.lecturer ?? ''} options={choices(unique(all.map(lecturerOf)))} onChange={(value) => setChosen((c) => ({ ...c, lecturer: value || undefined }))} />
      </Collapsible>
      {chosen.class_name || chosen.lecturer || chosen.period !== undefined ? <Button variant="secondary" label="Reset filters" onPress={() => setChosen({})} /> : null}

      <View className="gap-0.5">
        <Text variant="section">{`${shown.length} class${shown.length === 1 ? '' : 'es'}${period ? ` in ${period}` : ''}`}</Text>
        {summaries.data ? <Text variant="meta">{below} students below 75% in total</Text> : null}
      </View>
      {schedules.isPending ? <Text variant="muted">Loading...</Text> : null}
      {schedules.isError ? <Text variant="error">Could not load classes.</Text> : null}
      {schedules.data && shown.length === 0 ? (
        <Card>
          <EmptyState image="classes" title="No classes match" message="No classes match these filters." />
        </Card>
      ) : null}
      <Grid>
        {shown.map((schedule) => {
          const summary = summaries.data?.get(schedule.schedule_id);
          const average = summary && summary.class_average_pct !== null ? Number(summary.class_average_pct) : null;
          const lecturer = lecturerOf(schedule);
          return (
            <Pressable
              key={schedule.schedule_id}
              accessibilityRole="link"
              accessibilityLabel={schedule.class_name}
              onPress={() => router.push(`/class/${schedule.schedule_id}`)}
              className="flex-row items-center gap-3 rounded-card bg-surface p-4 active:opacity-90"
              style={{ boxShadow: shadows.card }}>
              <View className="flex-1 gap-1">
                <Text variant="card">{schedule.class_name}</Text>
                <View className="flex-row items-center gap-2">
                  <Avatar name={lecturer} id={schedule.lecturer_id} size={20} />
                  <Text variant="meta" className="flex-1">
                    {lecturer} · {slotLabel(schedule.week_day, schedule.start_time, schedule.end_time)}
                  </Text>
                </View>
                {summary ? (
                  <Text variant="meta">
                    {summary.enrolled} enrolled · {average === null ? 'no average yet' : `${Math.round(average)}% avg`} · {Number(summary.students_below_75)} below 75%
                  </Text>
                ) : null}
              </View>
              <ProgressRing value={average} size={52} label="Class average" />
            </Pressable>
          );
        })}
      </Grid>
    </Screen>
  );
}
