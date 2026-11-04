import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';

import { formatDayShort, hhmm, sessionPill, timeRange, type Session } from '../format';

const LIMIT = 5;

/** The "MON 26" block that starts a session line. */
export function DateBlock({ date }: { date: string }) {
  const [weekday, ...rest] = formatDayShort(date).split(' ');
  return (
    <View className="h-12 w-12 items-center justify-center rounded-block bg-primary-tint">
      <Text variant="label" className="text-primary">
        {weekday}
      </Text>
      <Text className="font-inter-bold text-primary">{rest[0]}</Text>
    </View>
  );
}

// The "Upcoming sessions" card of a class on a wide screen (Class details): a date block, the day, the time and room, and
// the status pill. `range` shows "09:00 to 11:00" instead of just the start time. Only the next five are listed, so the
// card next to it stays in view; the rest are in the Calendar.
export function UpcomingSessionsCard({ title, sessions, range = false }: { title: string; sessions: Session[]; range?: boolean }) {
  const router = useRouter();
  return (
    <Card title={title}>
      {sessions.length === 0 ? <Text variant="meta">No upcoming sessions.</Text> : null}
      {sessions.slice(0, LIMIT).map((session, index) => {
        const pill = sessionPill(session.status);
        return (
          <Pressable
            key={session.session_id}
            accessibilityRole="link"
            accessibilityLabel={`${formatDayShort(session.session_date)} ${timeRange(session)}, ${pill.label}`}
            onPress={() => router.push(`/session/${session.session_id}`)}
            className={`min-h-14 flex-row items-center gap-3 py-3 active:opacity-80 ${index === 0 ? '' : 'border-t border-border'}`}>
            <DateBlock date={session.session_date} />
            <View className="flex-1 gap-0.5">
              <Text variant="card">{formatDayShort(session.session_date)}</Text>
              <Text variant="meta">
                {range ? timeRange(session) : hhmm(session.start_time)}
                {session.location_name ? ` · ${session.location_name}` : ''}
              </Text>
            </View>
            <Badge label={pill.label} tone={pill.tone} dot={pill.dot} />
          </Pressable>
        );
      })}
      {sessions.length > LIMIT ? <Text variant="meta">{`${sessions.length - LIMIT} more later in the term`}</Text> : null}
    </Card>
  );
}
