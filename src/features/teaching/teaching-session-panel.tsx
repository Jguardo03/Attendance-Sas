import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Dropdown, Text, TextField } from '@/components/ui';
import { canChangeAttendance } from '@/features/attendance-edit/logic';
import { checkedInAt, hhmm, methodLabel, type Session } from '@/features/sessions/format';
import { useAttendanceList } from '@/features/sessions/queries';
import { useAttendanceRealtime } from '@/features/sessions/realtime';
import { attendeeStatus, type AttendeeStatus } from '@/features/sessions/teaching';
import { useAuth } from '@/providers/auth';

function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="min-w-[44%] flex-1 gap-1 rounded-lg border border-border bg-surface p-4" accessibilityLabel={`${label}: ${value}`}>
      <Text variant="title">{value}</Text>
      <Text variant="muted">{label}</Text>
    </View>
  );
}

const tone = (status: AttendeeStatus) => (status === 'Present' ? 'success' : status === 'Late' ? 'warning' : status === 'Absent' ? 'danger' : 'neutral');

// The lecturer's and admin's view of one session: the counts and every enrolled student with their status.
// Each student opens their record, where a lecturer (of this session) or an admin changes it or checks the student in.
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
        <Card>
          <Text variant="muted">This session is cancelled and is not counted in attendance.</Text>
        </Card>
      ) : before ? (
        <Card title="Session attendance">
          <Text variant="title">{`0/${enrolled}`}</Text>
          <Text variant="muted">Students can check in from {session.check_in_opens_at.slice(11, 16)}. Counts update live once the session starts.</Text>
        </Card>
      ) : over ? (
        <View className="flex-row flex-wrap gap-3">
          <Figure value={`${percent}%`} label={`Session attendance (${attended} of ${enrolled} attended)`} />
          <Figure value={present} label="Present" />
          <Figure value={late} label="Late" />
          <Figure value={count('Absent')} label="Absent" />
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          <Figure value={`${percent}%`} label="Session attendance" />
          <Figure value={`${attended}/${enrolled}`} label="Checked in" />
          <Figure value={late} label="Late" />
        </View>
      )}

      {can('attendance.edit_all') ? <Text variant="muted">Permission attendance.edit_all: you can change the attendance record of any student in any session.</Text> : null}

      <Card title={`Session attendees (${enrolled})`}>
        <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Name or student ID" autoCapitalize="none" />
        <Dropdown label="Status" value={status} options={[{ value: '', label: 'All' }, ...statuses.map((value) => ({ value, label: value }))]} onChange={setStatus} />
        {list.isPending ? <Text variant="muted">Loading...</Text> : null}
        {list.data && enrolled === 0 ? <Text variant="muted">No students are enrolled in this class.</Text> : null}
        {list.data && enrolled > 0 && visible.length === 0 ? <Text variant="muted">No students match.</Text> : null}
        {visible.map(({ row, status: label }) => (
          <View key={row.student_id} className="gap-1 border-t border-border pt-3">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1">
                {row.first_name} {row.last_name}
              </Text>
              <Badge label={label} tone={tone(label)} />
            </View>
            <Text variant="muted">
              {row.student_id}
              {row.status === 'present' || row.status === 'late' ? ` · ${checkedInAt({ session_id: session.session_id, status: row.status, checked_in_at: row.checked_in_at, check_in_method: row.check_in_method })} · ${methodLabel(row.check_in_method)}` : ''}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <Button variant="secondary" label="View record" onPress={() => router.push(`/attendance/${session.session_id}/${row.student_id}`)} />
              {editable && session.status === 'started' && label === 'Not checked in' ? (
                <Button label="Check in manually" onPress={() => router.push(`/attendance/${session.session_id}/${row.student_id}?edit=1`)} />
              ) : null}
            </View>
          </View>
        ))}
      </Card>
      {session.status === 'rescheduled' ? <Text variant="muted">Moved to {hhmm(session.start_time)}{session.location_name ? `, ${session.location_name}` : ''}.</Text> : null}
    </View>
  );
}
