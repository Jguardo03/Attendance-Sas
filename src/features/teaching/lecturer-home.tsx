import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, CardRow, EmptyState, Loading, Screen, Text } from '@/components/ui';
import { HomeBanner } from '@/features/sessions/components/home-banner';
import { UpcomingRow } from '@/features/sessions/components/upcoming-row';
import { formatDayLong } from '@/features/sessions/format';
import { useAppNow, useAttendanceCounts, useSessions } from '@/features/sessions/queries';
import { attended } from '@/features/sessions/teaching';
import { useIsExtraWide } from '@/features/shell/nav';
import { useMyProfile } from '@/features/shell/use-my-profile';
import { addDays } from '@/lib/dates';

import { useLecturerOverview } from './lecturer-overview';
import { TeachingSessionCard } from './teaching-session-card';

// Lecturer Home (Lecturer UI pages 1 and 2): a banner with the date, the greeting and the live (or next) session, today's
// sessions in a row with live figures, who is below 75% and what is coming up. On a very wide screen the banner and today's
// sessions take two thirds and the last two sit in a column on the right.
// Row level security limits everything to the sessions this lecturer teaches.
export function LecturerHome() {
  const router = useRouter();
  const wide = useIsExtraWide();
  const profile = useMyProfile();
  const overview = useLecturerOverview();
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

  const first = profile.data?.first_name;
  const live = todays.data?.find((session) => session.status === 'started');
  const liveCounts = live ? counts.data?.get(live.session_id) : undefined;

  const banner = (
    <HomeBanner
      date={today ? formatDayLong(today) : ' '}
      title={first ? `Hi, ${first}` : 'Hi'}
      todays={todays.data}
      upcoming={upcoming.data}
      live={live}
      detail={
        liveCounts ? (
          <Text className="text-primary-content">
            {attended(liveCounts)} of {liveCounts.enrolled} checked in · {liveCounts.late} late so far
          </Text>
        ) : undefined
      }
      action={live ? <Button variant="secondary" size="large" label="Open live session" onPress={() => router.push(`/session/${live.session_id}`)} /> : undefined}
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
      {todays.data?.length === 0 ? (
        <Card>
          <EmptyState
            image="calendar"
            title="No sessions today"
            message="You have no sessions today."
            actionLabel="Open calendar"
            onAction={() => router.push('/calendar')}
          />
        </Card>
      ) : null}
      <CardRow>
        {todays.data?.map((session) => (
          <TeachingSessionCard key={session.session_id} session={session} counts={counts.data?.get(session.session_id)} withAction />
        ))}
      </CardRow>
    </View>
  );

  const below = overview.ready && overview.classes > 0 ? (
    <Card>
      <Text variant="section">{overview.below === 0 ? 'No students below 75%' : `${overview.below} student${overview.below === 1 ? '' : 's'} below 75%`}</Text>
      <Text variant="meta">
        Across your {overview.classes} class{overview.classes === 1 ? '' : 'es'} this period
      </Text>
      <Button variant="secondary" label="See classes" onPress={() => router.push('/classes')} />
    </Card>
  ) : null;

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

  return (
    <Screen title="Home" header={null}>
      {wide ? (
        <View className="flex-row items-start gap-4">
          <View className="flex-[2] gap-4">
            {banner}
            {todayList}
          </View>
          <View className="flex-1 gap-4">
            {below}
            {comingUp}
          </View>
        </View>
      ) : (
        <>
          {banner}
          {todayList}
          {below}
          {comingUp}
        </>
      )}
    </Screen>
  );
}
