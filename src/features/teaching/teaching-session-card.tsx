import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Text } from '@/components/ui';
import { formatDayShort, statusBadge, whenAndWhere, type Session } from '@/features/sessions/format';
import { attendanceFraction, lecturerLabel, movedNote, type SessionCounts } from '@/features/sessions/teaching';

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
  const badge = statusBadge(session.status);
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

  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${session.class_name}, ${badge.label}`} onPress={open}>
      <Card>
        <View className="flex-row items-center justify-between gap-2">
          <Text variant="heading" className="flex-1">
            {session.class_name}
          </Text>
          <Badge label={badge.label} tone={badge.tone} />
        </View>
        <Text variant="muted">
          {showDate ? `${formatDayShort(session.session_date)} · ` : ''}
          {whenAndWhere(session)}
        </Text>
        {showLecturer ? <Text variant="muted">{lecturerLabel(session)}</Text> : null}
        {figure ? (
          <Text variant="muted">
            {figure}
            {!live && !over ? opensAt : ''}
          </Text>
        ) : null}
        {note && session.status !== 'cancelled' ? <Text variant="muted">{note}</Text> : null}
        {withAction ? <Button variant="secondary" label={live ? 'Open live attendance' : over ? 'View attendance' : 'View session'} onPress={open} /> : null}
      </Card>
    </Pressable>
  );
}
