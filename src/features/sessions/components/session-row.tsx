import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ProgressBar } from '@/components/charts';
import { Icon } from '@/components/icon';
import { Badge, Text } from '@/components/ui';
import { useIsMedium } from '@/features/shell/nav';
import { RING_THRESHOLD } from '@/lib/ring';
import { shadows } from '@/theme/tokens';

import { attendanceLabel, attendancePill, hhmm, sessionPill, type MyAttendance, type Session } from '../format';
import { attendanceFraction, attended, attendancePercent, type SessionCounts } from '../teaching';

// One session as one row of the Calendar day list (Student UI, Calendar): start and end time, a bar (solid blue while
// live), the class, the room and the status. A student also sees their own attendance once it is over; a lecturer sees
// the figure for the session ("18 of 24 checked in", a bar and "88%", "22 enrolled"). Phones stack the same things.
export function SessionRow({
  session,
  student = false,
  attendance,
  counts,
}: {
  session: Session;
  /** True for a student: show their own attendance instead of the class figure. */
  student?: boolean;
  attendance?: MyAttendance | null;
  counts?: SessionCounts;
}) {
  const router = useRouter();
  const wide = useIsMedium();
  const pill = sessionPill(session.status);
  const live = session.status === 'started';
  const over = session.status === 'finished';

  const mine = student && over ? attendanceLabel(session, attendance) : null;
  const percent = counts ? attendancePercent(counts) : 0;
  const figure = student || !counts || session.status === 'cancelled' ? '' : live ? `${attended(counts)} of ${counts.enrolled} checked in` : over ? attendanceFraction(session, counts) : `${counts.enrolled} enrolled`;
  const showBar = wide && over && counts && session.status !== 'cancelled' && !student;

  const room = session.location_name ? (
    <View className="flex-row items-center gap-1.5">
      <Icon name="pin" size={14} color="contentMuted" />
      <Text variant="meta">{session.location_name}</Text>
    </View>
  ) : null;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${session.class_name}, ${pill.label}`}
      onPress={() => router.push(`/session/${session.session_id}`)}
      className={`flex-row items-center gap-3 rounded-card border-2 bg-surface px-4 py-3 active:opacity-90 md:gap-4 ${live ? 'border-primary' : 'border-transparent'}`}
      style={{ boxShadow: shadows.card }}>
      {wide ? (
        <Text className="w-36 font-inter-bold">
          {hhmm(session.start_time)} <Text variant="meta">to {hhmm(session.end_time)}</Text>
        </Text>
      ) : (
        <View className="items-center">
          <Text className="font-inter-bold">{hhmm(session.start_time)}</Text>
          <Text variant="meta">{hhmm(session.end_time)}</Text>
        </View>
      )}
      <View className={`w-1 self-stretch rounded-full ${live ? 'bg-primary' : 'bg-primary/25'}`} aria-hidden />

      {wide ? (
        <>
          <Text variant="card" className="flex-[2]">
            {session.class_name}
          </Text>
          <View className="flex-1">{room}</View>
          <View className="w-32 flex-row">
            <Badge label={pill.label} tone={pill.tone} dot={pill.dot} />
          </View>
          <View className="w-48 flex-row items-center justify-end gap-3">
            {showBar && counts ? (
              <>
                <View className="flex-1">
                  <ProgressBar value={attended(counts)} max={counts.enrolled} tone={percent < RING_THRESHOLD ? 'danger' : 'success'} label={`${session.class_name} attendance`} />
                </View>
                <Text variant="card">{`${percent}%`}</Text>
              </>
            ) : figure ? (
              <Text variant={live ? 'card' : 'meta'}>{figure}</Text>
            ) : mine ? (
              <Badge label={mine} {...attendancePill(mine)} />
            ) : null}
          </View>
        </>
      ) : (
        <>
          <View className="flex-1 gap-1">
            <Text variant="card">{session.class_name}</Text>
            {room}
            <View className="flex-row flex-wrap items-center gap-2 pt-1">
              <Badge label={pill.label} tone={pill.tone} dot={pill.dot} />
              {mine ? <Badge label={mine} {...attendancePill(mine)} /> : null}
            </View>
            {figure ? <Text variant="meta">{figure}</Text> : null}
          </View>
          <Icon name="chevronRight" size={20} color="contentMuted" />
        </>
      )}
    </Pressable>
  );
}
