import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ClassArtwork } from '@/components/class-artwork';
import { ProgressRing } from '@/components/charts';
import { Badge, Card, EmptyState, Grid, Screen, Text, Loading } from '@/components/ui';
import { ClassTile } from '@/features/sessions/components/class-tile';
import { ClassesToolbar, classCount } from '@/features/sessions/components/classes-toolbar';
import { slotLabel } from '@/features/sessions/format';
import { useClassSummaries, useSchedules, useSessionTotals, type ClassSummary, type ScheduleOverview } from '@/features/sessions/queries';
import { useIsExtraWide, useIsMedium } from '@/features/shell/nav';
import { shadows } from '@/theme/tokens';

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
  const average = summary && summary.class_average_pct !== null ? Number(summary.class_average_pct) : null;
  const below = Number(summary?.students_below_75 ?? 0);
  const medium = useIsMedium();

  if (medium) {
    return (
      <ClassTile
        classId={schedule.class_id}
        name={schedule.class_name}
        onPress={() => router.push(`/class/${schedule.schedule_id}`)}
        ring={<ProgressRing value={average} size={44} label="Class average" />}
        lines={
          previous
            ? [{ icon: 'calendar', text: schedule.period_name }]
            : [
                { icon: 'clock', text: slotLabel(schedule.week_day, schedule.start_time, schedule.end_time) },
                ...(schedule.location_name ? [{ icon: 'pin' as const, text: schedule.location_name }] : []),
              ]
        }
        note={summary ? `${summary.enrolled} enrolled${totals && !previous ? ` · ${totals.held} of ${totals.total} held` : ''}` : undefined}
        pill={summary ? <Badge label={below > 0 ? `${below} below 75%` : 'On track'} tone={below > 0 ? 'danger' : 'success'} /> : undefined}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={schedule.class_name}
      onPress={() => router.push(`/class/${schedule.schedule_id}`)}
      className="flex-row items-center gap-3 rounded-card bg-surface p-3 active:opacity-90"
      style={{ boxShadow: shadows.card }}>
      <View className="h-16 w-16 overflow-hidden rounded-block">
        <ClassArtwork classId={schedule.class_id} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="card">{schedule.class_name}</Text>
        {previous ? (
          <Text variant="meta">
            {schedule.period_name}
            {summary ? ` · ${summary.enrolled} enrolled` : ''}
          </Text>
        ) : (
          <>
            <Text variant="meta">
              {slotLabel(schedule.week_day, schedule.start_time, schedule.end_time)}
              {schedule.location_name ? ` · ${schedule.location_name}` : ''}
            </Text>
            {summary ? (
              <Text variant="meta">
                {summary.enrolled} enrolled{totals ? ` · ${totals.held} of ${totals.total} sessions held` : ''}
              </Text>
            ) : null}
          </>
        )}
        {summary ? (
          <Text variant={below > 0 ? 'error' : 'meta'} className={below > 0 ? 'font-inter-semibold' : ''}>
            {belowText(below)}
          </Text>
        ) : null}
      </View>
      <ProgressRing value={average} size={52} label="Class average" />
    </Pressable>
  );
}

// Lecturer Classes (Lecturer UI pages 3 and 4): "Active period" with each class's enrolment, sessions held, who is
// below 75% and the class average as a ring, and earlier periods' classes. The schedules are the lecturer's own
// because of row level security.
export function LecturerClasses() {
  const [tab, setTab] = useState<'current' | 'previous'>('current');
  const schedules = useSchedules();
  const ids = (schedules.data ?? []).map((schedule) => schedule.schedule_id);
  const summaries = useClassSummaries(ids);
  const totals = useSessionTotals(ids);
  const medium = useIsMedium();
  const columns = useIsExtraWide() ? 3 : medium ? 2 : 1;

  const shown = (schedules.data ?? []).filter((schedule) => (tab === 'current' ? schedule.period_status !== 'finished' : schedule.period_status === 'finished'));
  const groups = [...new Set(shown.map((schedule) => `${schedule.period_name}|${schedule.period_status}`))];

  return (
    <Screen title="Classes">
      <ClassesToolbar
        value={tab}
        options={[
          { value: 'current', label: 'Active period' },
          { value: 'previous', label: 'Previous periods' },
        ]}
        onChange={(value) => setTab(value as 'current' | 'previous')}
        summary={shown.length === 0 ? undefined : tab === 'current' && groups.length === 1 ? `${shown[0].period_name} · ${classCount(shown.length)}` : classCount(shown.length)}
      />
      {schedules.isPending ? <Loading /> : null}
      {schedules.isError ? <Text variant="error">Could not load your classes.</Text> : null}
      {schedules.data && shown.length === 0 ? (
        <Card>
          <EmptyState
            image="classes"
            title={tab === 'current' ? 'No classes this period' : 'No previous classes'}
            message={tab === 'current' ? 'You are not teaching any current classes.' : 'Classes from earlier periods show here.'}
          />
        </Card>
      ) : null}
      {groups.map((group) => {
        const [period, status] = group.split('|');
        const inGroup = shown.filter((schedule) => `${schedule.period_name}|${schedule.period_status}` === group);
        const students = inGroup.reduce((sum, schedule) => sum + Number(summaries.data?.get(schedule.schedule_id)?.enrolled ?? 0), 0);
        return (
          <View key={group} className="gap-3">
            {!medium || groups.length > 1 ? (
              <View className="gap-0.5">
                {tab === 'current' ? <Text variant="section">{`${period} (${status})`}</Text> : null}
                <Text variant="meta">
                  {inGroup.length} class{inGroup.length === 1 ? '' : 'es'}
                  {summaries.data ? ` · ${students} students` : ''}
                </Text>
              </View>
            ) : null}
            <Grid columns={columns}>
              {inGroup.map((schedule) => (
                <ClassCard
                  key={schedule.schedule_id}
                  schedule={schedule}
                  summary={summaries.data?.get(schedule.schedule_id)}
                  totals={totals.data?.get(schedule.schedule_id)}
                  previous={tab === 'previous'}
                />
              ))}
            </Grid>
          </View>
        );
      })}
    </Screen>
  );
}
