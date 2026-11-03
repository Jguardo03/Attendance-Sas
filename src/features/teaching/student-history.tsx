import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { BreakdownRing } from '@/components/charts';
import { Icon } from '@/components/icon';
import { Badge, Button, Card, Dropdown, Screen, ScreenHeader, Text } from '@/components/ui';
import { attendancePill, formatDayShort, melbourneTime, methodLabel, slotLabel, timeRange } from '@/features/sessions/format';
import { useMyAttendance, useSessions, useSharedSchedules, useStudentClassNumbers, useStudentInfo } from '@/features/sessions/queries';
import { attendeeStatus } from '@/features/sessions/teaching';
import { RING_THRESHOLD } from '@/lib/ring';

// One student as the lecturer or admin sees them (Lecturer UI pages 22 and 23): who they are, the classes they share,
// and their attendance history in the chosen class, session by session, each with a link to the record.
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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  if (info.isPending) return <Screen standalone title="Student" header={<ScreenHeader title="Student" onBack={goBack} />}><Text variant="muted">Loading...</Text></Screen>;
  if (!info.data) return <Screen standalone title="Student" header={<ScreenHeader title="Student" onBack={goBack} />}><Text variant="error">This student was not found.</Text></Screen>;

  const person = info.data;
  const fullName = `${person.first_name} ${person.last_name}`;
  const schedule = shared.data?.find((item) => item.schedule_id === selected);
  const line = (session: (typeof held)[number]) => ({ session, status: attendeeStatus(session, rows.data?.get(session.session_id)), row: rows.data?.get(session.session_id) });
  const items = held.map(line).filter((item) => !filter || item.status === filter);
  const attended = numbers.data ? Number(numbers.data.present) + Number(numbers.data.late) : 0;
  const pct = numbers.data?.attendance_pct === null || numbers.data?.attendance_pct === undefined ? null : Math.round(Number(numbers.data.attendance_pct));

  return (
    <Screen standalone title={fullName} header={<ScreenHeader title={fullName} subtitle={`${person.id}${person.email ? ` · ${person.email}` : ''}`} onBack={goBack} />}>
      <Card>
        <View className="items-center gap-1">
          <Avatar name={fullName} id={person.id} size={72} />
          <Text variant="title" className="mt-2">
            {fullName}
          </Text>
        </View>
      </Card>

      <Card title="Shared classes">
        {shared.isPending ? <Text variant="muted">Loading...</Text> : null}
        {shared.data?.length === 0 ? <Text variant="meta">No shared classes.</Text> : null}
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
              className={`min-h-14 flex-row items-center gap-3 rounded-block border px-3 py-2 active:opacity-80 ${active ? 'border-primary bg-primary-tint' : 'border-border bg-surface'}`}>
              <View className="flex-1">
                <Text variant="card">{item.class_name}</Text>
                <Text variant="meta">{slotLabel(item.week_day, item.start_time, item.end_time)}</Text>
              </View>
              {active ? <Icon name="checkCircle" size={22} color="primary" /> : null}
            </Pressable>
          );
        })}
      </Card>

      {schedule ? (
        <>
          <Card variant="hero">
            <View className="flex-row items-center gap-4">
              <View className="rounded-full bg-surface p-1">
                {numbers.data && pct !== null ? (
                  <BreakdownRing present={Number(numbers.data.present)} late={Number(numbers.data.late)} absent={Number(numbers.data.absent)} percent={pct} size={76} strokeWidth={8} caption="" />
                ) : (
                  <BreakdownRing present={0} late={0} absent={0} size={76} strokeWidth={8} caption="" />
                )}
              </View>
              <View className="flex-1 gap-1">
                <Text variant="card" className="text-primary-content">{`Attendance history · ${schedule.class_name}`}</Text>
                {numbers.data && numbers.data.finished_sessions > 0 ? (
                  <>
                    <Text className="text-primary-content">
                      {attended} of {numbers.data.finished_sessions} sessions attended
                    </Text>
                    <Text className="text-primary-content">
                      {numbers.data.present} present · {numbers.data.late} late · {numbers.data.absent} absent
                    </Text>
                  </>
                ) : (
                  <Text className="text-primary-content">No finished sessions yet, so there is no percentage.</Text>
                )}
                {pct !== null && pct < RING_THRESHOLD ? (
                  <View className="flex-row">
                    <Badge label="Below 75%" tone="danger" dot />
                  </View>
                ) : null}
              </View>
            </View>
          </Card>

          <Card>
            <Dropdown
              label="Status"
              value={filter}
              options={[{ value: '', label: 'All' }, ...(['Present', 'Late', 'Absent'] as const).map((value) => ({ value, label: value }))]}
              onChange={setFilter}
            />
            {sessions.isPending ? <Text variant="muted">Loading...</Text> : null}
            {sessions.data && held.length === 0 ? <Text variant="meta">No sessions held yet. Finished sessions and their attendance show here.</Text> : null}
            {held.length > 0 && items.length === 0 ? <Text variant="meta">No sessions match.</Text> : null}
            {items.map(({ session, status, row }) => (
              <View key={session.session_id} className="gap-2 border-t border-border pt-3">
                <View className="flex-row items-center justify-between gap-2">
                  <View className="flex-1 gap-0.5">
                    <Text variant="card">
                      {formatDayShort(session.session_date)} · {timeRange(session)}
                    </Text>
                    <Text variant="meta">
                      {row && row.status !== 'absent' ? `${melbourneTime(row.checked_in_at)} · ${methodLabel(row.check_in_method)}` : 'No check in'}
                      {row?.comments ? ` · ${row.comments}` : ''}
                    </Text>
                  </View>
                  {session.status === 'cancelled' ? <Badge label="Cancelled" tone="cancelled" /> : <Badge label={status} {...attendancePill(status)} />}
                </View>
                {session.status !== 'cancelled' ? (
                  <View className="flex-row">
                    <Button variant="secondary" label="View record" onPress={() => router.push(`/attendance/${session.session_id}/${person.id}`)} />
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
