import { View } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { useAppNow, useAttendanceCounts, useSessions } from '@/features/sessions/queries';
import { addDays } from '@/lib/dates';

import { TeachingSessionCard } from './teaching-session-card';

// Lecturer Home: today's sessions with live figures and the right button, then the next sessions.
// Row level security limits everything to the sessions this lecturer teaches.
export function LecturerHome() {
  const now = useAppNow();
  const today = now.data?.slice(0, 10) ?? '';
  const horizon = today ? addDays(today, 30) : '';

  const todays = useSessions(['teach-today', today], (q) => q.eq('session_date', today).order('start_time'), Boolean(today), true);
  const upcoming = useSessions(
    ['teach-upcoming', today],
    (q) => q.gt('session_date', today).order('session_date').order('start_time').limit(10),
    Boolean(today),
  );
  const counts = useAttendanceCounts(today, horizon, Boolean(today));

  return (
    <Screen title="Home">
      <Text variant="heading">Today sessions</Text>
      {todays.isPending || now.isPending ? <Text variant="muted">Loading...</Text> : null}
      {todays.isError ? <Text variant="error">Could not load the sessions for today.</Text> : null}
      {todays.data?.length === 0 ? (
        <Card>
          <Text variant="muted">You have no sessions today.</Text>
        </Card>
      ) : null}
      <View className="gap-3">
        {todays.data?.map((session) => (
          <TeachingSessionCard key={session.session_id} session={session} counts={counts.data?.get(session.session_id)} withAction />
        ))}
      </View>

      <Text variant="heading">Upcoming sessions</Text>
      {upcoming.isError ? <Text variant="error">Could not load upcoming sessions.</Text> : null}
      {upcoming.data?.length === 0 ? (
        <Card>
          <Text variant="muted">No upcoming sessions.</Text>
        </Card>
      ) : null}
      <View className="gap-3">
        {upcoming.data?.map((session) => (
          <TeachingSessionCard key={session.session_id} session={session} counts={counts.data?.get(session.session_id)} showDate />
        ))}
      </View>
    </Screen>
  );
}
