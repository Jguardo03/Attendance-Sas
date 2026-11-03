import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, CardRow, EmptyState, Loading, Screen, Text } from '@/components/ui';
import { markCheckInStart } from '@/features/check-in/timing';
import { HomeBanner } from '@/features/sessions/components/home-banner';
import { SessionCard } from '@/features/sessions/components/session-card';
import { UpcomingRow } from '@/features/sessions/components/upcoming-row';
import { checkInState, formatDayLong } from '@/features/sessions/format';
import { useAppNow, useMyAttendance, useSchedules, useSessions, useStudentOverview } from '@/features/sessions/queries';
import { useIsExtraWide } from '@/features/shell/nav';
import { useMyProfile } from '@/features/shell/use-my-profile';
import { useAuth } from '@/providers/auth';

import { AttendanceSummary } from './attendance-summary';

// Student Home (Student UI pages 9 to 14): a banner with the date, the greeting and the live (or next) session with the
// Check in button, today's sessions in a row, "My attendance" and what is coming up. On a very wide screen the banner and
// today's sessions take two thirds and the last two sit in a column on the right.
export function StudentHome() {
  const router = useRouter();
  const wide = useIsExtraWide();
  const { claims } = useAuth();
  const profile = useMyProfile();
  const now = useAppNow();
  const today = now.data?.slice(0, 10) ?? '';

  const todays = useSessions(['today', today], (q) => q.eq('session_date', today).order('start_time'), Boolean(today), true);
  const upcoming = useSessions(
    ['upcoming', today],
    (q) => q.gt('session_date', today).order('session_date').order('start_time').limit(10),
    Boolean(today),
  );
  const schedules = useSchedules();
  const overview = useStudentOverview(claims?.appUserId);

  const attendance = useMyAttendance(claims?.appUserId, [
    ...(todays.data ?? []).map((session) => session.session_id),
    ...(upcoming.data ?? []).map((session) => session.session_id),
  ]);

  const first = profile.data?.first_name;
  const live = todays.data?.find((session) => session.status === 'started');
  const liveState = live ? checkInState(live, attendance.data?.get(live.session_id)) : null;
  const noClasses = schedules.data?.length === 0;

  const banner = (
    <HomeBanner
      date={today ? formatDayLong(today) : ' '}
      title={noClasses ? `Welcome${first ? `, ${first}` : ''}` : first ? `Hi, ${first}` : 'Hi'}
      todays={noClasses ? undefined : todays.data}
      upcoming={upcoming.data}
      live={noClasses ? undefined : live}
      message={noClasses ? 'You are not enrolled in any classes yet.' : undefined}
      action={
        liveState?.kind === 'open' ? (
          <Button
            variant="secondary"
            size="large"
            icon="check"
            label="Check in now"
            onPress={() => {
              markCheckInStart();
              router.push(`/check-in/${live?.session_id}`);
            }}
          />
        ) : liveState?.kind === 'checked_in' ? (
          <Button variant="secondary" size="large" icon="checkCircle" label="Checked in" disabled />
        ) : undefined
      }
    />
  );

  const todayList = (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text variant="section">Today&apos;s sessions</Text>
        {todays.data && todays.data.length > 0 ? <Text variant="meta">{todays.data.length} today</Text> : null}
      </View>
      {todays.isPending || now.isPending ? <Loading /> : null}
      {todays.isError ? <Text variant="error">Could not load the sessions for today.</Text> : null}
      {todays.data?.length === 0 && !noClasses ? (
        <Card>
          <EmptyState
            image="calendar"
            title="No sessions today"
            message="Enjoy the free time."
            actionLabel="Open calendar"
            onAction={() => router.push('/calendar')}
          />
        </Card>
      ) : null}
      <CardRow>
        {todays.data?.map((session) => (
          <SessionCard key={session.session_id} session={session} attendance={attendance.data?.get(session.session_id)} showMyAttendance />
        ))}
      </CardRow>
    </View>
  );

  const comingUp = (
    <Card>
      <View className="flex-row items-center justify-between">
        <Text variant="card">Coming up</Text>
        <Button variant="ghost" label="Calendar" onPress={() => router.push('/calendar')} />
      </View>
      {upcoming.isError ? <Text variant="error">Could not load upcoming sessions.</Text> : null}
      {upcoming.data?.length === 0 ? <Text variant="meta">No upcoming sessions.</Text> : null}
      {upcoming.data?.slice(0, 5).map((session) => (
        <UpcomingRow key={session.session_id} session={session} />
      ))}
    </Card>
  );

  // Not enrolled anywhere yet (Student UI page 14).
  if (noClasses) {
    return (
      <Screen title="Home" header={null}>
        {banner}
        <Card>
          <EmptyState image="classes" title="No classes yet" message="You're not enrolled in any classes for this period. When your institution adds you to a class, your sessions will show here." />
        </Card>
        <Text variant="meta" className="text-center">
          Wrong? Contact your institution&apos;s admin.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen title="Home" header={null}>
      {wide ? (
        <View className="flex-row items-start gap-4">
          <View className="flex-[2] gap-4">
            {banner}
            {todayList}
          </View>
          <View className="flex-1 gap-4">
            <AttendanceSummary numbers={overview.data?.values()} />
            {comingUp}
          </View>
        </View>
      ) : (
        <>
          {banner}
          {todayList}
          <AttendanceSummary numbers={overview.data?.values()} />
          {comingUp}
        </>
      )}
    </Screen>
  );
}
