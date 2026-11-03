import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Dropdown, Screen, Text } from '@/components/ui';
import { formatDayShort, melbourneTime, methodLabel, slotLabel, timeRange } from '@/features/sessions/format';
import { useMyAttendance, useSessions, useSharedSchedules, useStudentClassNumbers, useStudentInfo } from '@/features/sessions/queries';
import { attendeeStatus, type AttendeeStatus } from '@/features/sessions/teaching';

const tone = (status: AttendeeStatus) => (status === 'Present' ? 'success' : status === 'Late' ? 'warning' : status === 'Absent' ? 'danger' : 'neutral');

// One student as the lecturer or admin sees them: who they are, the classes they share, and their attendance history
// in the chosen class, session by session, each with a link to the record.
export function StudentHistory({ studentId, scheduleId }: { studentId: string; scheduleId: number | null }) {
  const router = useRouter();
  const [picked, setPicked] = useState<number | null>(scheduleId);
  const [filter, setFilter] = useState('');

  const info = useStudentInfo(studentId);
  const shared = useSharedSchedules(studentId);
  const selected = picked ?? shared.data?.[0]?.schedule_id ?? null;
  const numbers = useStudentClassNumbers(studentId, selected);
  const sessions = useSessions(['schedule-teach', selected], (q) => q.eq('schedule_id', selected as number).order('session_date'), selected !== null);
  const held = (sessions.data ?? []).filter((session) => session.status === 'started' || session.status === 'finished' || session.status === 'cancelled').reverse();
  const rows = useMyAttendance(studentId, held.map((session) => session.session_id));

  const back = <Button variant="secondary" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
  if (info.isPending) return <Screen standalone title="Student">{back}<Text variant="muted">Loading...</Text></Screen>;
  if (!info.data) return <Screen standalone title="Student">{back}<Text variant="error">This student was not found.</Text></Screen>;

  const person = info.data;
  const schedule = shared.data?.find((item) => item.schedule_id === selected);
  const line = (session: (typeof held)[number]) => ({ session, status: attendeeStatus(session, rows.data?.get(session.session_id)), row: rows.data?.get(session.session_id) });
  const items = held.map(line).filter((item) => !filter || item.status === filter);
  const attended = numbers.data ? Number(numbers.data.present) + Number(numbers.data.late) : 0;
  const pct = numbers.data?.attendance_pct === null || numbers.data?.attendance_pct === undefined ? null : Math.round(Number(numbers.data.attendance_pct));

  return (
    <Screen standalone title={`${person.first_name} ${person.last_name}`}>
      {back}
      <Card>
        <Text variant="muted">Student ID: {person.id}</Text>
        <Text variant="muted">Email: {person.email}</Text>
      </Card>

      <Card title="Shared classes">
        {shared.isPending ? <Text variant="muted">Loading...</Text> : null}
        {shared.data?.length === 0 ? <Text variant="muted">No shared classes.</Text> : null}
        {shared.data?.map((item) => {
          const active = item.schedule_id === selected;
          return (
            <Pressable
              key={item.schedule_id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${item.class_name} ${slotLabel(item.week_day, item.start_time, item.end_time)}`}
              onPress={() => {
                setPicked(item.schedule_id);
                setFilter('');
              }}
              className={`rounded-md border px-3 py-3 ${active ? 'border-primary bg-primary/10' : 'border-border'}`}>
              <Text>{active ? `✓ ${item.class_name}` : item.class_name}</Text>
              <Text variant="muted">{slotLabel(item.week_day, item.start_time, item.end_time)}</Text>
            </Pressable>
          );
        })}
      </Card>

      {schedule ? (
        <Card title={`Attendance history · ${schedule.class_name}`}>
          {numbers.data && numbers.data.finished_sessions > 0 ? (
            <View className="flex-row items-center justify-between gap-2">
              <Text variant="muted">
                {attended} of {numbers.data.finished_sessions} sessions attended
              </Text>
              {pct !== null ? <Badge label={`${pct}%`} tone={pct < 75 ? 'danger' : 'success'} /> : null}
            </View>
          ) : (
            <Text variant="muted">No finished sessions yet, so there is no percentage.</Text>
          )}
          <Dropdown
            label="Status"
            value={filter}
            options={[{ value: '', label: 'All' }, ...(['Present', 'Late', 'Absent'] as const).map((value) => ({ value, label: value }))]}
            onChange={setFilter}
          />
          {sessions.isPending ? <Text variant="muted">Loading...</Text> : null}
          {sessions.data && held.length === 0 ? <Text variant="muted">No sessions held yet. Finished sessions and their attendance show here.</Text> : null}
          {held.length > 0 && items.length === 0 ? <Text variant="muted">No sessions match.</Text> : null}
          {items.map(({ session, status, row }) => (
            <View key={session.session_id} className="gap-1 border-t border-border pt-3">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1">
                  {formatDayShort(session.session_date)} · {timeRange(session)}
                </Text>
                <Badge label={session.status === 'cancelled' ? 'Cancelled' : status} tone={session.status === 'cancelled' ? 'neutral' : tone(status)} />
              </View>
              <Text variant="muted">
                {row && row.status !== 'absent' ? `${melbourneTime(row.checked_in_at)} · ${methodLabel(row.check_in_method)}` : 'No check in'}
                {row?.comments ? ` · ${row.comments}` : ''}
              </Text>
              {session.status !== 'cancelled' ? (
                <Button variant="secondary" label="View record" onPress={() => router.push(`/attendance/${session.session_id}/${person.id}`)} />
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
