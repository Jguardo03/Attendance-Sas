import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ProgressRing } from '@/components/charts';
import { Badge, Banner, Button, Card, Dropdown, Text, TextField, Loading } from '@/components/ui';
import { canChangeAttendance } from '@/features/attendance-edit/logic';
import { attendancePill, checkedInAt, hhmm, methodLabel, type Session } from '@/features/sessions/format';
import { useAttendanceList } from '@/features/sessions/queries';
import { useAttendanceRealtime } from '@/features/sessions/realtime';
import { attendeeStatus, type AttendeeStatus } from '@/features/sessions/teaching';
import { useAuth } from '@/providers/auth';

// The lecturer's and admin's view of one session (Lecturer UI pages 9 to 15): the counts in a blue banner and every
// enrolled student with their status. Each student opens their record, where a lecturer (of this session) or an
// admin changes it or checks the student in.
export function TeachingSessionPanel({ session }: { session: Session }) {
  const checkInOpen = session.status !== 'cancelled' && session.status !== 'finished' && session.now_local >= session.check_in_opens_at;
  const router = useRouter();
  const { can, claims } = useAuth();
  const list = useAttendanceList(session.session_id, true, checkInOpen);
  // New check ins and changes arrive as they happen; the 10 second polling above is the fallback.
  useAttendanceRealtime(`session_id=eq.${session.session_id}`);
  const editable = canChangeAttendance(session, can, claims?.appUserId);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // This screen stays mounted under the room QR page, so coming back to it refetches the list at once.
  const { refetch } = list;
  const focused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focused.current) void refetch();
      focused.current = true;
    }, [refetch]),
  );

  const rows = (list.data ?? []).map((row) => ({ row, status: attendeeStatus(session, row) }));
  const count = (wanted: AttendeeStatus) => rows.filter((item) => item.status === wanted).length;
  const enrolled = rows.length;
  const present = count('Present');
  const late = count('Late');
  const attended = present + late;
  const percent = enrolled > 0 ? Math.round((100 * attended) / enrolled) : 0;
  const over = session.status === 'finished';
  const cancelled = session.status === 'cancelled';
  const before = session.now_local < session.check_in_opens_at;

  const needle = search.trim().toLowerCase();
  const visible = rows.filter(
    (item) =>
      (!status || item.status === status) &&
      (!needle || `${item.row.first_name} ${item.row.last_name} ${item.row.student_id}`.toLowerCase().includes(needle)),
  );
  const statuses = [...new Set(rows.map((item) => item.status))];

  return (
    <View className="gap-4">
      {cancelled ? (
        <Banner tone="warning" title="This session was cancelled" message="This session is cancelled and is not counted in attendance." />
      ) : before ? (
        <Card title={`Check in opens at ${session.check_in_opens_at.slice(11, 16)}`}>
          <Text variant="meta">Students can check in 10 minutes before the start. Counts update live once the session starts.</Text>
          <Text variant="card">{`0 of ${enrolled} checked in`}</Text>
        </Card>
      ) : (
        <Card variant="hero">
          <View className="flex-row items-center gap-4">
            <View className="rounded-full bg-surface p-1">
              <ProgressRing value={percent} size={76} strokeWidth={8} label="Session attendance" />
            </View>
            <View className="flex-1 gap-0.5">
              <Text variant="card" className="text-primary-content">
                Session attendance
              </Text>
              <Text className="font-inter-bold text-title text-primary-content">{`${attended} of ${enrolled}`}</Text>
              <Text className="text-primary-content">
                {present} present · {late} late · {over ? `${count('Absent')} absent` : `${enrolled - attended} not yet`}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {can('attendance.edit_all') ? <Text variant="meta">Permission attendance.edit_all: you can change the attendance record of any student in any session.</Text> : null}

      <Card title={before ? `Enrolled students (${enrolled})` : `Session attendees (${enrolled})`}>
        <View className="gap-3 md:flex-row">
          <View className="md:flex-1">
            <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Name or student ID" autoCapitalize="none" />
          </View>
          <View className="md:flex-1">
            <Dropdown label="Status" value={status} options={[{ value: '', label: 'All' }, ...statuses.map((value) => ({ value, label: value }))]} onChange={setStatus} />
          </View>
        </View>
        {list.isPending ? <Loading /> : null}
        {list.data && enrolled === 0 ? <Text variant="meta">No students are enrolled in this class.</Text> : null}
        {list.data && enrolled > 0 && visible.length === 0 ? <Text variant="meta">No students match.</Text> : null}
        {visible.map(({ row, status: label }) => (
          <View key={row.student_id} className="gap-2 border-t border-border pt-3">
            <View className="flex-row items-center gap-3">
              <Avatar name={`${row.first_name} ${row.last_name}`} id={row.student_id} size={40} />
              <View className="flex-1 gap-0.5">
                <Text variant="card">
                  {row.first_name} {row.last_name}
                </Text>
                <Text variant="meta">
                  {row.student_id}
                  {row.status === 'present' || row.status === 'late' ? ` · ${checkedInAt({ session_id: session.session_id, status: row.status, checked_in_at: row.checked_in_at, check_in_method: row.check_in_method })} · ${methodLabel(row.check_in_method)}` : ''}
                </Text>
              </View>
              <Badge label={label} {...attendancePill(label)} />
            </View>
            <View className="flex-row flex-wrap gap-2 pl-[52px]">
              <Button variant="secondary" label="View record" onPress={() => router.push(`/attendance/${session.session_id}/${row.student_id}`)} />
              {editable && session.status === 'started' && label === 'Not checked in' ? (
                <Button label="Check in manually" onPress={() => router.push(`/attendance/${session.session_id}/${row.student_id}?edit=1`)} />
              ) : null}
            </View>
          </View>
        ))}
      </Card>
      {session.status === 'rescheduled' ? <Text variant="meta">Moved to {hhmm(session.start_time)}{session.location_name ? `, ${session.location_name}` : ''}.</Text> : null}
    </View>
  );
}
