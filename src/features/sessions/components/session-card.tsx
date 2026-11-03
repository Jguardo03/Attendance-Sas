import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ClassArtwork } from '@/components/class-artwork';
import { Icon } from '@/components/icon';
import { Badge, Button, Text } from '@/components/ui';
import { markCheckInStart } from '@/features/check-in/timing';
import { shadows } from '@/theme/tokens';

import {
  attendanceLabel,
  checkInState,
  formatDayShort,
  lecturerName,
  sessionPill,
  whenAndWhere,
  type MyAttendance,
  type Session,
} from '../format';

// One session in a list (Student UI, "Today's sessions"): the class artwork with the status pill, the name, when and
// where, the lecturer, and for a student the right button (Check in, or why not yet). The card opens the session.
// `showDate` is for lists that span several days.
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
  const pill = sessionPill(session.status);
  const state = checkInState(session, attendance);
  const lecturer = lecturerName(session);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${session.class_name}, ${pill.label}`}
      onPress={() => router.push(`/session/${session.session_id}`)}
      className="overflow-hidden rounded-card bg-surface active:opacity-90"
      style={{ boxShadow: shadows.card }}>
      <View className="h-24 bg-cream">
        <ClassArtwork classId={session.class_id} fit="whole" />
        <View className="absolute right-3 top-3">
          <Badge label={pill.label} tone={pill.tone} dot={pill.dot} />
        </View>
      </View>
      <View className="gap-2 p-4">
        <Text variant="card">{session.class_name}</Text>
        <View className="flex-row items-center gap-2">
          <Icon name="clock" size={16} color="contentMuted" />
          <Text variant="meta" className="flex-1">
            {showDate ? `${formatDayShort(session.session_date)} · ` : ''}
            {whenAndWhere(session)}
          </Text>
        </View>
        {lecturer ? (
          <View className="flex-row items-center gap-2">
            <Avatar name={lecturer} id={session.lecturer_id} size={24} />
            <Text variant="meta">{lecturer}</Text>
          </View>
        ) : null}
        {showMyAttendance && session.status === 'finished' ? <Text variant="meta">My attendance: {attendanceLabel(session, attendance)}</Text> : null}
        {showMyAttendance && state.kind === 'open' ? (
          <Button
            label="Check in"
            icon="check"
            onPress={() => {
              markCheckInStart();
              router.push(`/check-in/${session.session_id}`);
            }}
          />
        ) : null}
        {showMyAttendance && state.kind === 'not_open' ? <Button label={`Check in ${state.label.charAt(0).toLowerCase()}${state.label.slice(1)}`} disabled /> : null}
      </View>
    </Pressable>
  );
}
