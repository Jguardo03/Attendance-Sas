import { View } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { SessionCard } from '@/features/sessions/components/session-card';
import { useAppNow, useMyAttendance, useSessions } from '@/features/sessions/queries';
import { useAuth } from '@/providers/auth';

// Student Home: today's sessions (Live / Upcoming / Finished) and the next sessions after today.
export function StudentHome() {
  const { claims } = useAuth();
  const now = useAppNow();
  const today = now.data?.slice(0, 10) ?? '';

  const todays = useSessions(['today', today], (q) => q.eq('session_date', today).order('start_time'), Boolean(today), true);
  const upcoming = useSessions(
    ['upcoming', today],
    (q) => q.gt('session_date', today).order('session_date').order('start_time').limit(10),
    Boolean(today),
  );

  const attendance = useMyAttendance(claims?.appUserId, [
    ...(todays.data ?? []).map((session) => session.session_id),
    ...(upcoming.data ?? []).map((session) => session.session_id),
  ]);

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
          <SessionCard key={session.session_id} session={session} attendance={attendance.data?.get(session.session_id)} showMyAttendance />
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
          <SessionCard key={session.session_id} session={session} showDate />
        ))}
      </View>
    </Screen>
  );
}
