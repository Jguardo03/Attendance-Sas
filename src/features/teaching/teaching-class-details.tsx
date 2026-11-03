import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Dropdown, Screen, Select, Text, TextField } from '@/components/ui';
import { adminHref } from '@/features/admin/routes';
import { formatDayShort, slotLabel, statusBadge, timeRange } from '@/features/sessions/format';
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
import { useAuth } from '@/providers/auth';

const sorts: { value: StudentSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'lowest', label: 'Lowest attendance first' },
  { value: 'highest', label: 'Highest attendance first' },
];

// Class details for a lecturer or an admin: the class, how it is going, every enrolled student with their
// attendance in this class, and the class's sessions. An admin can jump to the enrolment screen.
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

  const back = <Button variant="secondary" label="Back to Classes" onPress={() => (router.canGoBack() ? router.back() : router.replace('/classes'))} />;
  if (schedule.isPending) return <Screen standalone title="Class details">{back}<Text variant="muted">Loading...</Text></Screen>;
  if (!schedule.data) return <Screen standalone title="Class details">{back}<Text variant="error">This class was not found.</Text></Screen>;

  const info = schedule.data;
  const nowLocal = now.data ?? '';
  const all = sessions.data ?? [];
  const upcoming = all.filter((session) => session.ends_at > nowLocal);
  const previous = all.filter((session) => session.ends_at <= nowLocal).reverse();
  const list = sortStudents(searchStudents(students.data ?? [], search), sort);
  const below = Number(summary?.students_below_75 ?? 0);

  return (
    <Screen standalone title={info.class_name}>
      {back}
      <Card>
        <Text variant="muted">
          {info.period_name} ({info.period_status}) · {slotLabel(info.week_day, info.start_time, info.end_time)} · {info.frequency_name}
        </Text>
        <Text variant="muted">Location: {info.location_name}</Text>
        <Text variant="muted">
          Lecturer: {info.lecturer_first_name} {info.lecturer_last_name}
        </Text>
        {info.class_description ? <Text>{info.class_description}</Text> : null}
        {can('classes.manage') ? <Button variant="secondary" label="Manage enrolment" onPress={() => router.push(adminHref('schedules', scheduleId))} /> : null}
      </Card>

      <Card title="How this class is going">
        {summary && summary.class_average_pct !== null ? (
          <Text variant="title">{Math.round(Number(summary.class_average_pct))}% class average</Text>
        ) : (
          <Text variant="muted">No finished sessions yet, so there is no average.</Text>
        )}
        <Text variant="muted">
          {below === 0 ? 'No students below 75%' : `${below} student${below === 1 ? '' : 's'} below 75%`}
          {totals ? ` · ${totals.held} of ${totals.total} sessions held` : ''}
        </Text>
      </Card>

      <Select
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
          <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Name or student ID" autoCapitalize="none" />
          <Dropdown label="Sort" value={sort} options={sorts} onChange={(value) => setSort(value as StudentSort)} />
          {students.isPending ? <Text variant="muted">Loading...</Text> : null}
          {students.data?.length === 0 ? (
            <Card title="No students enrolled yet">
              <Text variant="muted">Students appear here once your institution enrols them in this class. Attendance percentages show after the first finished session. Enrolment is managed by admin.</Text>
            </Card>
          ) : null}
          {students.data && students.data.length > 0 && list.length === 0 ? (
            <Card>
              <Text variant="muted">No students match.</Text>
            </Card>
          ) : null}
          {list.map((student) => {
            const pct = student.attendance_pct === null ? null : Math.round(Number(student.attendance_pct));
            return (
              <Pressable key={student.student_id} accessibilityRole="link" accessibilityLabel={`${student.first_name} ${student.last_name} ${student.student_id}`} onPress={() => router.push(`/student/${student.student_id}?schedule=${scheduleId}`)}>
              <Card>
                <View className="flex-row items-center justify-between gap-2">
                  <Text variant="heading" className="flex-1">
                    {student.first_name} {student.last_name}
                  </Text>
                  {pct === null ? <Text variant="muted">No sessions yet</Text> : <Badge label={`${pct}%`} tone={pct < 75 ? 'danger' : 'success'} />}
                </View>
                <Text variant="muted">
                  {student.student_id}
                  {pct === null ? '' : ` · ${student.present} present · ${student.late} late · ${student.absent} absent`}
                </Text>
              </Card>
              </Pressable>
            );
          })}
        </>
      ) : null}

      {tab !== 'students' && sessions.data && (tab === 'upcoming' ? upcoming : previous).length === 0 ? (
        <Card>
          <Text variant="muted">{tab === 'upcoming' ? 'No upcoming sessions.' : 'No sessions held yet. Finished sessions and their attendance show here.'}</Text>
        </Card>
      ) : null}
      {tab !== 'students'
        ? (tab === 'upcoming' ? upcoming : previous).map((session) => {
            const badge = statusBadge(session.status);
            const row = counts.data?.get(session.session_id);
            return (
              <Pressable key={session.session_id} accessibilityRole="link" accessibilityLabel={`${formatDayShort(session.session_date)} ${timeRange(session)}`} onPress={() => router.push(`/session/${session.session_id}`)}>
                <Card>
                  <View className="flex-row items-center justify-between gap-2">
                    <Text variant="heading" className="flex-1">
                      {formatDayShort(session.session_date)} · {timeRange(session)}
                    </Text>
                    <Badge label={badge.label} tone={badge.tone} />
                  </View>
                  <Text variant="muted">{session.location_name}</Text>
                  {tab === 'previous' && session.status !== 'cancelled' && row ? <Text variant="muted">Session attendance {attendancePercent(row)}%</Text> : null}
                  {tab === 'upcoming' && row ? <Text variant="muted">{row.enrolled} enrolled</Text> : null}
                </Card>
              </Pressable>
            );
          })
        : null}
    </Screen>
  );
}
