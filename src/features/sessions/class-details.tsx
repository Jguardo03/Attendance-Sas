import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { Badge, Button, Card, Screen, Select, Text } from '@/components/ui';
import { useAuth } from '@/providers/auth';

import {
  attendanceLabel,
  checkedInAt,
  formatDayShort,
  methodLabel,
  slotLabel,
  statusBadge,
  timeRange,
  type MyAttendance,
  type Session,
} from './format';
import { useAppNow, useMyAttendance, useSchedule, useSessions, useStudentOverview } from './queries';

function ClassSessionRow({ session, attendance, previous }: { session: Session; attendance?: MyAttendance | null; previous: boolean }) {
  const router = useRouter();
  const badge = statusBadge(session.status);
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${formatDayShort(session.session_date)} ${timeRange(session)}`} onPress={() => router.push(`/session/${session.session_id}`)}>
      <Card>
        <Text variant="heading">
          {formatDayShort(session.session_date)} · {timeRange(session)}
        </Text>
        {previous ? (
          session.status === 'cancelled' ? (
            <Badge label="Cancelled" tone="danger" />
          ) : (
            <>
              <Text variant="muted">
                {attendance && attendance.status !== 'absent' ? `Checked in ${checkedInAt(attendance)} · ${methodLabel(attendance.check_in_method)}` : 'No check-in'}
              </Text>
              <Badge label={attendanceLabel(session, attendance)} tone={attendanceLabel(session, attendance) === 'Absent' ? 'danger' : attendanceLabel(session, attendance) === 'Late' ? 'warning' : 'success'} />
            </>
          )
        ) : (
          <>
            <Text variant="muted">{session.location_name}</Text>
            <Badge label={badge.label} tone={badge.tone} />
          </>
        )}
      </Card>
    </Pressable>
  );
}

// Class details for a student: the class, "My attendance in this class", and its upcoming and previous sessions.
export function ClassDetails({ scheduleId }: { scheduleId: number }) {
  const router = useRouter();
  const { claims } = useAuth();
  const [tab, setTab] = useState<'upcoming' | 'previous'>('upcoming');
  const schedule = useSchedule(scheduleId);
  const now = useAppNow();
  const sessions = useSessions(['schedule', scheduleId], (q) => q.eq('schedule_id', scheduleId).order('session_date'));
  const numbers = useStudentOverview(claims?.appUserId);
  const attendance = useMyAttendance(claims?.appUserId, (sessions.data ?? []).map((session) => session.session_id));

  const back = (
    <Button variant="secondary" label="Back to Classes" onPress={() => (router.canGoBack() ? router.back() : router.replace('/classes'))} />
  );

  if (schedule.isPending) return <Screen standalone title="Class details">{back}<Text variant="muted">Loading...</Text></Screen>;
  if (!schedule.data) return <Screen standalone title="Class details">{back}<Text variant="error">This class was not found.</Text></Screen>;

  const info = schedule.data;
  const mine = numbers.data?.get(scheduleId);
  const nowLocal = now.data ?? '';
  const all = sessions.data ?? [];
  const upcoming = all.filter((session) => session.ends_at > nowLocal);
  const previous = all.filter((session) => session.ends_at <= nowLocal).reverse();
  const shown = tab === 'upcoming' ? upcoming : previous;

  return (
    <Screen standalone title={info.class_name}>
      {back}
      <Card>
        <Text variant="muted">
          Term: {info.period_name} ({info.period_status})
        </Text>
        <Text variant="muted">Day + time: {slotLabel(info.week_day, info.start_time, info.end_time)}</Text>
        <Text variant="muted">Frequency: {info.frequency_name}</Text>
        <Text variant="muted">Location: {info.location_name}</Text>
        <Text variant="muted">
          Lecturer: {info.lecturer_first_name} {info.lecturer_last_name}
        </Text>
        {info.lecturer_email ? <Text variant="muted">{info.lecturer_email}</Text> : null}
        {info.class_description ? <Text>{info.class_description}</Text> : null}
      </Card>

      <Card title="My attendance in this class">
        {mine && mine.attendance_pct !== null ? (
          <>
            <Text variant="title">{Math.round(Number(mine.attendance_pct))}%</Text>
            <Text variant="muted">
              {mine.present} present · {mine.late} late · {mine.absent} absent
            </Text>
          </>
        ) : (
          <Text variant="muted">No finished sessions yet.</Text>
        )}
      </Card>

      <Select
        label="Sessions"
        value={tab}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'previous', label: 'Previous' },
        ]}
        onChange={(value) => setTab(value as 'upcoming' | 'previous')}
      />
      {sessions.data && shown.length === 0 ? (
        <Card>
          <Text variant="muted">{tab === 'upcoming' ? 'No upcoming sessions.' : 'No previous sessions.'}</Text>
        </Card>
      ) : null}
      {shown.map((session) => (
        <ClassSessionRow key={session.session_id} session={session} attendance={attendance.data?.get(session.session_id)} previous={tab === 'previous'} />
      ))}
    </Screen>
  );
}
