import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ProgressRing } from '@/components/charts';
import { Icon } from '@/components/icon';
import { Badge, Button, Card, Dropdown, EmptyState, Screen, ScreenHeader, SegmentedTabs, Text, TextField, Loading } from '@/components/ui';
import { adminHref } from '@/features/admin/routes';
import { formatDayShort, sessionPill, slotLabel, timeRange } from '@/features/sessions/format';
import {
  useAppNow,
  useAttendanceCounts,
  useClassStudents,
  useClassSummaries,
  useSchedule,
  useSessionTotals,
  useSessions,
} from '@/features/sessions/queries';
import { attendancePercent, searchStudents, sortStudents, type StudentSort } from '@/features/sessions/teaching';
import { RING_THRESHOLD } from '@/lib/ring';
import { useAuth } from '@/providers/auth';

const sorts: { value: StudentSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'lowest', label: 'Lowest attendance first' },
  { value: 'highest', label: 'Highest attendance first' },
];

// Class details for a lecturer or an admin (Lecturer UI pages 5 to 8): the class, how it is going, every enrolled
// student with their attendance in this class, and the class's sessions. An admin can jump to the enrolment screen.
export function TeachingClassDetails({ scheduleId }: { scheduleId: number }) {
  const router = useRouter();
  const { can } = useAuth();
  const [tab, setTab] = useState<'students' | 'upcoming' | 'previous'>('students');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<StudentSort>('name');

  const schedule = useSchedule(scheduleId);
  const students = useClassStudents(scheduleId);
  const summary = useClassSummaries([scheduleId]).data?.get(scheduleId);
  const totals = useSessionTotals([scheduleId]).data?.get(scheduleId);
  const now = useAppNow();
  const sessions = useSessions(['schedule-teach', scheduleId], (q) => q.eq('schedule_id', scheduleId).order('session_date'));
  const dates = (sessions.data ?? []).map((session) => session.session_date);
  const counts = useAttendanceCounts(dates[0] ?? '', dates[dates.length - 1] ?? '', dates.length > 0);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/classes'));
  if (schedule.isPending) return <Screen standalone title="Class details" header={<ScreenHeader title="Class details" onBack={goBack} />}><Loading /></Screen>;
  if (!schedule.data) return <Screen standalone title="Class details" header={<ScreenHeader title="Class details" onBack={goBack} />}><Text variant="error">This class was not found.</Text></Screen>;

  const info = schedule.data;
  const nowLocal = now.data ?? '';
  const all = sessions.data ?? [];
  const upcoming = all.filter((session) => session.ends_at > nowLocal);
  const previous = all.filter((session) => session.ends_at <= nowLocal).reverse();
  const list = sortStudents(searchStudents(students.data ?? [], search), sort);
  const below = Number(summary?.students_below_75 ?? 0);
  const average = summary && summary.class_average_pct !== null ? Number(summary.class_average_pct) : null;
  const shown = tab === 'upcoming' ? upcoming : previous;
  const lecturer = `${info.lecturer_first_name ?? ''} ${info.lecturer_last_name ?? ''}`.trim();

  return (
    <Screen
      standalone
      title={info.class_name}
      header={<ScreenHeader title={info.class_name} subtitle={`${students.data?.length ?? 0} enrolled · ${info.period_name} (${info.period_status})`} onBack={goBack} />}>
      <Card variant="hero">
        <View className="flex-row items-center gap-4">
          <View className="rounded-full bg-surface p-1">
            <ProgressRing value={average} size={76} strokeWidth={8} label="Class average" />
          </View>
          <View className="flex-1 gap-1">
            <Text variant="card" className="text-primary-content">
              How this class is going
            </Text>
            <Text className="text-primary-content">
              {average === null ? 'No finished sessions yet, so there is no average.' : `${Math.round(average)}% class average`}
            </Text>
            <Text className="text-primary-content">
              {below === 0 ? 'No students below 75%' : `${below} student${below === 1 ? '' : 's'} below 75%`}
              {totals ? ` · ${totals.held} of ${totals.total} sessions held` : ''}
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <View className="flex-row items-center gap-2">
          <Icon name="clock" size={18} color="contentMuted" />
          <Text className="flex-1">
            {slotLabel(info.week_day, info.start_time, info.end_time)} · {info.frequency_name}
          </Text>
        </View>
        {info.location_name ? (
          <View className="flex-row items-center gap-2">
            <Icon name="pin" size={18} color="contentMuted" />
            <Text className="flex-1">{info.location_name}</Text>
          </View>
        ) : null}
        {lecturer ? (
          <View className="flex-row items-center gap-2">
            <Avatar name={lecturer} id={info.lecturer_id} size={24} />
            <Text className="flex-1">{lecturer}</Text>
          </View>
        ) : null}
        {info.class_description ? <Text variant="meta">{info.class_description}</Text> : null}
        {can('classes.manage') ? <Button variant="secondary" label="Manage enrolment" onPress={() => router.push(adminHref('schedules', scheduleId))} /> : null}
      </Card>

      <SegmentedTabs
        label="Show"
        value={tab}
        options={[
          { value: 'students', label: `Students (${students.data?.length ?? 0})` },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'previous', label: 'Previous' },
        ]}
        onChange={(value) => setTab(value as typeof tab)}
      />

      {tab === 'students' ? (
        <>
          {students.data && students.data.length > 0 ? (
            <View className="gap-3 md:flex-row">
              <View className="md:flex-1">
                <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Name or student ID" autoCapitalize="none" />
              </View>
              <View className="md:flex-1">
                <Dropdown label="Sort" value={sort} options={sorts} onChange={(value) => setSort(value as StudentSort)} />
              </View>
            </View>
          ) : null}
          {students.isPending ? <Loading /> : null}
          {students.data?.length === 0 ? (
            <Card>
              <EmptyState
                image="classes"
                title="No students enrolled yet"
                message="Students appear here once your institution enrols them in this class. Attendance percentages show after the first finished session. Enrolment is managed by admin."
              />
            </Card>
          ) : null}
          {students.data && students.data.length > 0 && list.length === 0 ? <Text variant="meta">No students match.</Text> : null}
          {list.length > 0 ? (
            <Card>
              {list.map((student, index) => {
                const pct = student.attendance_pct === null ? null : Math.round(Number(student.attendance_pct));
                return (
                  <Pressable
                    key={student.student_id}
                    accessibilityRole="link"
                    accessibilityLabel={`${student.first_name} ${student.last_name} ${student.student_id}`}
                    onPress={() => router.push(`/student/${student.student_id}?schedule=${scheduleId}`)}
                    className={`min-h-14 flex-row items-center gap-3 py-2 active:opacity-80 ${index === list.length - 1 ? '' : 'border-b border-border'}`}>
                    <Avatar name={`${student.first_name} ${student.last_name}`} id={student.student_id} size={40} />
                    <View className="flex-1 gap-0.5">
                      <Text variant="card">
                        {student.first_name} {student.last_name}
                      </Text>
                      <Text variant="meta">
                        {student.student_id}
                        {pct === null ? '' : ` · ${student.present} present · ${student.late} late · ${student.absent} absent`}
                      </Text>
                    </View>
                    {pct === null ? (
                      <Text variant="meta">No sessions yet</Text>
                    ) : (
                      <Badge label={`${pct}% ${pct < RING_THRESHOLD ? 'Below 75%' : 'On track'}`} tone={pct < RING_THRESHOLD ? 'danger' : 'success'} dot />
                    )}
                  </Pressable>
                );
              })}
            </Card>
          ) : null}
        </>
      ) : null}

      {tab !== 'students' ? (
        <Card>
          {sessions.data && shown.length === 0 ? (
            <Text variant="meta">{tab === 'upcoming' ? 'No upcoming sessions.' : 'No sessions held yet. Finished sessions and their attendance show here.'}</Text>
          ) : null}
          {shown.map((session, index) => {
            const pill = sessionPill(session.status);
            const row = counts.data?.get(session.session_id);
            return (
              <Pressable
                key={session.session_id}
                accessibilityRole="link"
                accessibilityLabel={`${formatDayShort(session.session_date)} ${timeRange(session)}`}
                onPress={() => router.push(`/session/${session.session_id}`)}
                className={`min-h-14 flex-row items-center gap-3 py-2 active:opacity-80 ${index === shown.length - 1 ? '' : 'border-b border-border'}`}>
                <View className="flex-1 gap-0.5">
                  <Text variant="card">
                    {formatDayShort(session.session_date)} · {timeRange(session)}
                  </Text>
                  <Text variant="meta">{session.location_name}</Text>
                  {tab === 'previous' && session.status !== 'cancelled' && row ? <Text variant="meta">Session attendance {attendancePercent(row)}%</Text> : null}
                  {tab === 'upcoming' && row ? <Text variant="meta">{row.enrolled} enrolled</Text> : null}
                </View>
                <Badge label={pill.label} tone={pill.tone} dot={pill.dot} />
              </Pressable>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}
