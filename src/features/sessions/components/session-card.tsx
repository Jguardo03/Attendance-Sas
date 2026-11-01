import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';

import {
  attendanceLabel,
  checkInState,
  formatDayShort,
  lecturerName,
  statusBadge,
  whenAndWhere,
  type MyAttendance,
  type Session,
} from '../format';

// One session in a list. Rows open the session details. `showDate` is for lists that span several days.
export function SessionCard({
  session,
  attendance,
  showDate = false,
  showMyAttendance = false,
}: {
  session: Session;
  attendance?: MyAttendance | null;
  showDate?: boolean;
  showMyAttendance?: boolean;
}) {
  const router = useRouter();
  const badge = statusBadge(session.status);
  const state = checkInState(session, attendance);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${session.class_name}, ${badge.label}`}
      onPress={() => router.push(`/session/${session.session_id}`)}>
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
        <Text variant="muted">{lecturerName(session)}</Text>
        {showMyAttendance && session.status === 'finished' ? (
          <Text variant="muted">My attendance: {attendanceLabel(session, attendance)}</Text>
        ) : null}
        {showMyAttendance && (state.kind === 'not_open' || state.kind === 'open') ? (
          <Text variant="muted">{state.kind === 'not_open' ? `Check in ${state.label.charAt(0).toLowerCase()}${state.label.slice(1)}` : 'Check in is open'}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}
