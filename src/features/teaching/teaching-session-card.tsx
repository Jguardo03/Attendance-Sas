import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ProgressBar } from '@/components/charts';
import { Icon } from '@/components/icon';
import { Badge, Button, Text } from '@/components/ui';
import { formatDayShort, lecturerName, sessionPill, whenAndWhere, type Session } from '@/features/sessions/format';
import { attendanceFraction, attended, attendancePercent, movedNote, type SessionCounts } from '@/features/sessions/teaching';
import { RING_THRESHOLD } from '@/lib/ring';
import { shadows } from '@/theme/tokens';

// One session in a lecturer or admin list. Shows the attendance figure ("18/24 · 75%") once the session is live or
// over, and "N enrolled" before it. `withAction` adds the Home button (Open live attendance / View session /
// View attendance), which opens the session.
export function TeachingSessionCard({
  session,
  counts,
  showDate = false,
  showLecturer = false,
  withAction = false,
}: {
  session: Session;
  counts?: SessionCounts;
  showDate?: boolean;
  showLecturer?: boolean;
  withAction?: boolean;
}) {
  const router = useRouter();
  const pill = sessionPill(session.status);
  const open = () => router.push(`/session/${session.session_id}`);

  const live = session.status === 'started';
  const over = session.status === 'finished';
  const note = movedNote(session);
  const figure = counts
    ? live || over || session.status === 'cancelled'
      ? attendanceFraction(session, counts)
      : `${counts.enrolled} enrolled`
    : '';
  const opensAt = session.now_local < session.check_in_opens_at && counts ? ` · check in opens ${session.check_in_opens_at.slice(11, 16)}` : '';
  const lecturer = lecturerName(session);
  // The bar is blue while the session runs and green or red once it is over, like the percentage rings.
  const bar = live ? 'primary' : attendancePercent(counts ?? { enrolled: 0, present: 0, late: 0 }) < RING_THRESHOLD ? 'danger' : 'success';

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${session.class_name}, ${pill.label}`}
      onPress={open}
      className="gap-2 rounded-card bg-surface p-4 active:opacity-90"
      style={{ boxShadow: shadows.card }}>
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="card" className="flex-1">
          {session.class_name}
        </Text>
        <Badge label={pill.label} tone={pill.tone} dot={pill.dot} />
      </View>
      <View className="flex-row items-center gap-2">
        <Icon name="clock" size={16} color="contentMuted" />
        <Text variant="meta" className="flex-1">
          {showDate ? `${formatDayShort(session.session_date)} · ` : ''}
          {whenAndWhere(session)}
        </Text>
      </View>
      {showLecturer && lecturer ? (
        <View className="flex-row items-center gap-2">
          <Avatar name={lecturer} id={session.lecturer_id} size={24} />
          <Text variant="meta">{lecturer}</Text>
        </View>
      ) : null}
      {counts && (live || over) ? <ProgressBar value={attended(counts)} max={counts.enrolled} tone={bar} label={`${session.class_name} attendance`} /> : null}
      {figure ? (
        <Text variant="meta">
          {figure}
          {!live && !over ? opensAt : ''}
        </Text>
      ) : null}
      {note && session.status !== 'cancelled' ? <Text variant="meta">{note}</Text> : null}
      {withAction ? <Button variant="secondary" label={live ? 'Open live attendance' : over ? 'View attendance' : 'View session'} onPress={open} /> : null}
    </Pressable>
  );
}
