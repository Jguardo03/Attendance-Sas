import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ClassArtwork } from '@/components/class-artwork';
import { ProgressRing } from '@/components/charts';
import { Badge, EmptyState, Grid, Screen, Text, Card, Loading } from '@/components/ui';
import { ClassTile } from '@/features/sessions/components/class-tile';
import { ClassesToolbar, classCount } from '@/features/sessions/components/classes-toolbar';
import { slotLabel } from '@/features/sessions/format';
import { useSchedules, useStudentOverview, type AttendanceNumbers, type ScheduleOverview } from '@/features/sessions/queries';
import { useIsExtraWide, useIsMedium } from '@/features/shell/nav';
import { RING_THRESHOLD } from '@/lib/ring';
import { useAuth } from '@/providers/auth';
import { shadows } from '@/theme/tokens';

// The database's percentage for a class, or null while there are no finished sessions yet.
const percentOf = (numbers: AttendanceNumbers | undefined) => (!numbers || numbers.attendance_pct === null ? null : Number(numbers.attendance_pct));

function ClassCard({ schedule, numbers, previous }: { schedule: ScheduleOverview; numbers?: AttendanceNumbers; previous: boolean }) {
  const router = useRouter();
  const percent = percentOf(numbers);
  const lecturer = `${schedule.lecturer_first_name ?? ''} ${schedule.lecturer_last_name ?? ''}`.trim();
  const medium = useIsMedium();

  if (medium) {
    return (
      <ClassTile
        classId={schedule.class_id}
        name={schedule.class_name}
        onPress={() => router.push(`/class/${schedule.schedule_id}`)}
        ring={<ProgressRing value={percent} size={44} label={previous ? 'Attendance' : 'My attendance'} />}
        lines={
          previous
            ? [{ icon: 'calendar', text: schedule.period_name }]
            : [
                { icon: 'clock', text: slotLabel(schedule.week_day, schedule.start_time, schedule.end_time) },
                ...(schedule.location_name ? [{ icon: 'pin' as const, text: schedule.location_name }] : []),
              ]
        }
        lecturer={lecturer}
        lecturerId={schedule.lecturer_id}
        pill={
          percent === null ? (
            <Badge label="No sessions yet" tone="neutral" />
          ) : (
            <Badge label={percent < RING_THRESHOLD ? `Below ${RING_THRESHOLD}%` : 'On track'} tone={percent < RING_THRESHOLD ? 'danger' : 'success'} />
          )
        }
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
        <Text variant="meta">
          {previous ? schedule.period_name : `${slotLabel(schedule.week_day, schedule.start_time, schedule.end_time)}${schedule.location_name ? ` · ${schedule.location_name}` : ''}`}
        </Text>
        {lecturer ? (
          <View className="flex-row items-center gap-1.5">
            <Avatar name={lecturer} id={schedule.lecturer_id} size={20} />
            <Text variant="meta">{lecturer}</Text>
          </View>
        ) : null}
        {percent !== null && percent < RING_THRESHOLD ? <Text variant="error" className="font-inter-semibold">Below {RING_THRESHOLD}%</Text> : null}
        {percent === null ? <Text variant="meta">No finished sessions yet</Text> : null}
      </View>
      <ProgressRing value={percent} size={52} label={previous ? 'Attendance' : 'My attendance'} />
    </Pressable>
  );
}

// Student Classes (Student UI pages 15 to 18): the current period's classes, and earlier periods' classes with their
// final attendance, each with its percentage ring (red below 75%).
export function StudentClasses() {
  const { claims } = useAuth();
  const [tab, setTab] = useState<'current' | 'previous'>('current');
  const schedules = useSchedules();
  const numbers = useStudentOverview(claims?.appUserId);
  const medium = useIsMedium();
  const columns = useIsExtraWide() ? 3 : medium ? 2 : 1;

  const current = (schedules.data ?? []).filter((schedule) => schedule.period_status !== 'finished');
  const previous = (schedules.data ?? []).filter((schedule) => schedule.period_status === 'finished');
  const shown = tab === 'current' ? current : previous;

  // Group by period so each heading reads "2026 Term 4 (active)".
  const groups = [...new Set(shown.map((schedule) => `${schedule.period_name}|${schedule.period_status}`))];

  return (
    <Screen title="Classes">
      <ClassesToolbar
        value={tab}
        options={[
          { value: 'current', label: 'Active period' },
          { value: 'previous', label: 'Previous' },
        ]}
        onChange={(value) => setTab(value as 'current' | 'previous')}
        summary={shown.length === 0 ? undefined : tab === 'current' && groups.length === 1 ? `${shown[0].period_name} · ${classCount(shown.length)}` : classCount(shown.length)}
      />
      {schedules.isPending ? <Loading /> : null}
      {schedules.isError ? <Text variant="error">Could not load your classes.</Text> : null}
      {schedules.data && shown.length === 0 ? (
        <Card>
          {tab === 'current' ? (
            <EmptyState
              image="classes"
              title="No classes this period"
              message="You're not enrolled in any classes this period yet. Check previous periods, or contact your admin if this looks wrong."
              actionLabel="See previous periods"
              onAction={() => setTab('previous')}
            />
          ) : (
            <EmptyState image="classes" title="No previous classes" message="Classes from earlier periods show here with your final attendance." />
          )}
        </Card>
      ) : null}
      {groups.map((group) => {
        const [period, status] = group.split('|');
        return (
          <View key={group} className="gap-3">
            {tab === 'current' && (!medium || groups.length > 1) ? <Text variant="section">{`${period} (${status})`}</Text> : null}
            <Grid columns={columns}>
              {shown
                .filter((schedule) => `${schedule.period_name}|${schedule.period_status}` === group)
                .map((schedule) => (
                  <ClassCard key={schedule.schedule_id} schedule={schedule} numbers={numbers.data?.get(schedule.schedule_id)} previous={tab === 'previous'} />
                ))}
            </Grid>
          </View>
        );
      })}
    </Screen>
  );
}
