import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Icon, type IconName } from '@/components/icon';
import { Badge, Banner, Card, Dropdown, Text, TextField, Loading } from '@/components/ui';
import { attendancePill, checkedInAt, hhmm, methodLabel, type Session } from '@/features/sessions/format';
import { useAttendanceList } from '@/features/sessions/queries';
import { useAttendanceRealtime } from '@/features/sessions/realtime';
import { attendeeStatus, type AttendeeStatus } from '@/features/sessions/teaching';
import { useIsWide } from '@/features/shell/nav';
import { useAuth } from '@/providers/auth';
import { shadows, type ColorToken } from '@/theme/tokens';

const banner = require('../../../assets/images/Artboard Banner.png');
const circle = require('../../../assets/images/whiteBackgroudCircle.png');

// The tile and icon of each count card, written out in full so the styling tool can see the class names.
const tones: Record<'present' | 'late' | 'absent' | 'waiting', { icon: IconName; color: ColorToken; tint: string }> = {
  present: { icon: 'checkCircle', color: 'success', tint: 'bg-success-tint' },
  late: { icon: 'clock', color: 'warning', tint: 'bg-warning-tint' },
  absent: { icon: 'close', color: 'danger', tint: 'bg-danger-tint' },
  waiting: { icon: 'clock', color: 'contentMuted', tint: 'bg-surface-muted' },
};

// One of the four count cards: a lead (the percentage in a white circle, or an icon tile) beside the label, the figure and
// a note. All four share this layout; the first sits on the banner artwork.
function CountCard({ lead, label, value, note, hero = false }: { lead: ReactNode; label: string; value: string; note: string; hero?: boolean }) {
  const color = hero ? 'text-primary-content' : '';
  const body = (
    <View className="flex-row items-center gap-4">
      {lead}
      <View className="flex-1">
        <Text variant="meta" className={color}>
          {label}
        </Text>
        <Text className={`font-inter-bold text-title ${color}`}>{value}</Text>
        <Text variant="meta" className={color}>
          {note}
        </Text>
      </View>
    </View>
  );
  if (hero) {
    return (
      <View className="flex-[1.2]">
        <Card variant="hero" image={banner}>
          {body}
        </Card>
      </View>
    );
  }
  return (
    <View className="flex-1 justify-center rounded-card bg-surface p-5" style={{ boxShadow: shadows.card }}>
      {body}
    </View>
  );
}

function IconTile({ tone }: { tone: keyof typeof tones }) {
  const { icon, color, tint } = tones[tone];
  return (
    <View className={`h-14 w-14 items-center justify-center rounded-block ${tint}`}>
      <Icon name={icon} size={28} color={color} />
    </View>
  );
}

function PercentCircle({ percent }: { percent: number }) {
  return (
    <View className="h-16 w-16 items-center justify-center">
      <Image source={circle} aria-hidden style={{ position: 'absolute', width: '100%', height: '100%' }} />
      <Text className="font-inter-bold text-card text-primary">{`${percent}%`}</Text>
    </View>
  );
}

// The lecturer's and admin's view of one session (Lecturer UI pages 9 to 17): the counts and every enrolled student with
// their status. From 1024 px the counts are four cards (attendance on the banner, on time, late, not yet or absent) and
// the students a table with one line each; on a phone one banner holds the figures and each student is a tappable card.
// Each student opens their record, where a lecturer (of this session) or an admin changes it or checks the student in.
export function TeachingSessionPanel({ session }: { session: Session }) {
  const checkInOpen = session.status !== 'cancelled' && session.status !== 'finished' && session.now_local >= session.check_in_opens_at;
  const router = useRouter();
  const wide = useIsWide();
  const { can } = useAuth();
  const list = useAttendanceList(session.session_id, true, checkInOpen);
  // New check ins and changes arrive as they happen; the 10 second polling above is the fallback.
  useAttendanceRealtime(`session_id=eq.${session.session_id}`);
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
  const missing = over ? count('Absent') : enrolled - attended;

  const needle = search.trim().toLowerCase();
  const visible = rows.filter(
    (item) =>
      (!status || item.status === status) &&
      (!needle || `${item.row.first_name} ${item.row.last_name} ${item.row.student_id}`.toLowerCase().includes(needle)),
  );
  const statuses = [...new Set(rows.map((item) => item.status))];
  const open = (studentId: string) => router.push(`/attendance/${session.session_id}/${studentId}`);

  // The summary: nothing but a notice when cancelled or not open yet, else the figures on the banner.
  const figures: [string, string][] = over
    ? [[`${percent}%`, 'Attended'], [String(present), 'Present'], [String(late), 'Late'], [String(missing), 'Absent']]
    : [[`${percent}%`, 'Attendance'], [`${attended}/${enrolled}`, 'Checked in'], [String(late), 'Late']];
  const summary = cancelled ? (
    <Banner tone="warning" title="This session was cancelled" message="This session is cancelled and is not counted in attendance." />
  ) : before ? (
    <Card title={`Check in opens at ${session.check_in_opens_at.slice(11, 16)}`}>
      <Text variant="meta">Students can check in 10 minutes before the start. Counts update live once the session starts.</Text>
      <Text variant="card">{`0 of ${enrolled} checked in`}</Text>
    </Card>
  ) : wide ? (
    <View className="flex-row gap-4">
      <CountCard hero lead={<PercentCircle percent={percent} />} label="Session attendance" value={`${attended} of ${enrolled}`} note={over ? 'students attended' : 'students checked in'} />
      <CountCard lead={<IconTile tone="present" />} label="Present" value={String(present)} note="on time" />
      <CountCard lead={<IconTile tone="late" />} label="Late" value={String(late)} note="checked in late" />
      <CountCard
        lead={<IconTile tone={over ? 'absent' : 'waiting'} />}
        label={over ? 'Absent' : 'Not checked in'}
        value={String(missing)}
        note={over ? 'did not check in' : 'absent at session end'}
      />
    </View>
  ) : (
    <Card variant="hero" image={banner}>
      <View className="flex-row justify-around">
        {figures.map(([value, label]) => (
          <View key={label} className="items-center">
            <Text className="font-inter-bold text-title text-primary-content">{value}</Text>
            <Text className="text-primary-content">{label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );

  const title = before ? 'Enrolled students' : 'Session attendees';
  const searchBox = <TextField label="Search" hideLabel value={search} onChangeText={setSearch} placeholder="Name or student ID" autoCapitalize="none" />;
  const statusBox = <Dropdown accessibilityLabel="Status" value={status} options={[{ value: '', label: 'All' }, ...statuses.map((value) => ({ value, label: value }))]} onChange={setStatus} />;
  const notes = (
    <>
      {list.isPending ? <Loading /> : null}
      {list.data && enrolled === 0 ? <Text variant="meta">No students are enrolled in this class.</Text> : null}
      {list.data && enrolled > 0 && visible.length === 0 ? <Text variant="meta">No students match.</Text> : null}
    </>
  );

  // When and how the student checked in; a dash for someone who has not.
  const checkIn = ({ row }: (typeof rows)[number]) =>
    row.status === 'present' || row.status === 'late'
      ? { when: checkedInAt({ session_id: session.session_id, status: row.status, checked_in_at: row.checked_in_at, check_in_method: row.check_in_method }), how: methodLabel(row.check_in_method) }
      : { when: '-', how: '-' };

  const attendees = wide ? (
    <Card>
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Text variant="section">{title}</Text>
        <View className="flex-row gap-3">
          <View className="w-64">{searchBox}</View>
          <View className="w-44">{statusBox}</View>
        </View>
      </View>
      {notes}
      {visible.length > 0 ? (
        <View className="flex-row items-center gap-3 pt-1">
          <Text variant="label" className="flex-[2]">
            Student
          </Text>
          <Text variant="label" className="flex-1">
            ID
          </Text>
          <Text variant="label" className="w-36">
            Status
          </Text>
          {before ? null : (
            <>
              <Text variant="label" className="w-28">
                Checked in at
              </Text>
              <Text variant="label" className="w-28">
                Method
              </Text>
            </>
          )}
          <View className="w-12" />
        </View>
      ) : null}
      {visible.map((item) => {
        const { row, status: label } = item;
        const { when, how } = checkIn(item);
        return (
          <Pressable
            key={row.student_id}
            accessibilityRole="link"
            accessibilityLabel={`${row.first_name} ${row.last_name} ${row.student_id}, ${label}`}
            onPress={() => open(row.student_id)}
            className="min-h-14 flex-row items-center gap-3 border-t border-border py-2 active:opacity-80">
            <View className="flex-[2] flex-row items-center gap-3">
              <Avatar name={`${row.first_name} ${row.last_name}`} id={row.student_id} size={40} />
              <Text variant="card" className="flex-1">
                {row.first_name} {row.last_name}
              </Text>
            </View>
            <Text variant="meta" className="flex-1">
              {row.student_id}
            </Text>
            <View className="w-36 flex-row">
              <Badge label={label} {...attendancePill(label)} />
            </View>
            {before ? null : (
              <>
                <Text className="w-28">{when}</Text>
                <Text className="w-28">{how}</Text>
              </>
            )}
            <Text className="w-12 font-inter-semibold text-primary">View</Text>
          </Pressable>
        );
      })}
    </Card>
  ) : (
    <View className="gap-3">
      <Text variant="section">{title}</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">{searchBox}</View>
        <View className="w-36">{statusBox}</View>
      </View>
      {notes}
      {visible.map((item) => {
        const { row, status: label } = item;
        const { when, how } = checkIn(item);
        return (
          <Pressable
            key={row.student_id}
            accessibilityRole="link"
            accessibilityLabel={`${row.first_name} ${row.last_name} ${row.student_id}, ${label}`}
            onPress={() => open(row.student_id)}
            className="min-h-16 flex-row items-center gap-3 rounded-block border border-border bg-surface px-3 py-2 active:opacity-80">
            <Avatar name={`${row.first_name} ${row.last_name}`} id={row.student_id} size={40} />
            <View className="flex-1 gap-0.5">
              <Text variant="card">
                {row.first_name} {row.last_name}
              </Text>
              <Text variant="meta">{when === '-' ? row.student_id : `${row.student_id} · ${when} · ${how}`}</Text>
            </View>
            <View>
              <Badge label={label} {...attendancePill(label)} />
            </View>
            <Icon name="chevronRight" size={20} color="contentMuted" />
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View className="gap-4">
      {summary}
      {can('attendance.edit_all') ? <Text variant="meta">Permission attendance.edit_all: you can change the attendance record of any student in any session.</Text> : null}
      {attendees}
      {session.status === 'rescheduled' ? <Text variant="meta">Moved to {hhmm(session.start_time)}{session.location_name ? `, ${session.location_name}` : ''}.</Text> : null}
    </View>
  );
}
