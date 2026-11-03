import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ProgressRing } from '@/components/charts';
import { Badge, Button, Card, EmptyState, Grid, Screen, Text, useColumns } from '@/components/ui';
import { UpcomingRow } from '@/features/sessions/components/upcoming-row';
import { formatDayLong, formatDayShort, hhmm, whenAndWhere } from '@/features/sessions/format';
import { useAppNow, useAttendanceCounts, useSessions } from '@/features/sessions/queries';
import { attended, attendancePercent } from '@/features/sessions/teaching';
import { useIsExtraWide } from '@/features/shell/nav';
import { useMyProfile } from '@/features/shell/use-my-profile';
import { addDays } from '@/lib/dates';
import { useAuth } from '@/providers/auth';

import { useLecturerOverview } from './lecturer-overview';
import { TeachingSessionCard } from './teaching-session-card';

const banner = require('../../../assets/images/Artboard Banner.png');

// Lecturer Home (Lecturer UI pages 1 and 2): a greeting, the session that is live now, today's sessions with live
// figures, who is below 75% and what is coming up. On a very wide screen the last two sit in a column on the right.
// Row level security limits everything to the sessions this lecturer teaches.
export function LecturerHome() {
  const router = useRouter();
  const wide = useIsExtraWide();
  const columns = useColumns();
  const { claims } = useAuth();
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
  const name = profile.data ? `${profile.data.first_name} ${profile.data.last_name}` : '';
  const live = todays.data?.find((session) => session.status === 'started');
  const liveCounts = live ? counts.data?.get(live.session_id) : undefined;
  const next = upcoming.data?.[0];

  const header = (
    <View className="flex-row items-center gap-3">
      <Avatar name={name || claims?.role || '?'} id={claims?.appUserId ?? undefined} size={44} />
      <View className="flex-1">
        <Text variant="meta">{today ? formatDayLong(today) : ' '}</Text>
        <Text variant="title">{first ? `Hi, ${first}` : 'Hi'}</Text>
      </View>
    </View>
  );

  const hero = live ? (
    <Card variant="hero" image={banner}>
      <View className="flex-row">
        <Badge label="Live now" tone="upcoming" dot />
      </View>
      <View className="flex-row items-center gap-4">
        {liveCounts ? (
          <View className="rounded-full bg-surface p-1">
            <ProgressRing value={attendancePercent(liveCounts)} size={64} strokeWidth={7} label="Session attendance" />
          </View>
        ) : null}
        <View className="flex-1 gap-0.5">
          <Text className="font-inter-bold text-title text-primary-content">{live.class_name}</Text>
          <Text className="text-primary-content">{whenAndWhere(live)}</Text>
          {liveCounts ? (
            <Text className="text-primary-content">
              {attended(liveCounts)} of {liveCounts.enrolled} checked in · {liveCounts.late} late so far
            </Text>
          ) : null}
        </View>
      </View>
      <View className="mt-2 w-full self-start md:w-60">
        <Button variant="secondary" size="large" label="Open live session" onPress={() => router.push(`/session/${live.session_id}`)} />
      </View>
    </Card>
  ) : null;

  const todayList = (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text variant="section">Today&apos;s sessions</Text>
        {todays.data && todays.data.length > 0 ? <Text variant="meta">{todays.data.length} today</Text> : null}
      </View>
      {todays.isPending || now.isPending ? <Text variant="muted">Loading...</Text> : null}
      {todays.isError ? <Text variant="error">Could not load the sessions for today.</Text> : null}
      {todays.data?.length === 0 ? (
        <Card>
          <EmptyState
            image="calendar"
            title="No sessions today"
            message={`You have no sessions today.${next ? ` Your next session is ${formatDayShort(next.session_date)} at ${hhmm(next.start_time)}.` : ''}`}
            actionLabel="Open calendar"
            onAction={() => router.push('/calendar')}
          />
        </Card>
      ) : null}
      <Grid columns={wide ? columns - 1 : columns}>
        {todays.data?.map((session) => (
          <TeachingSessionCard key={session.session_id} session={session} counts={counts.data?.get(session.session_id)} withAction />
        ))}
      </Grid>
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
    <Screen title="Home" header={header}>
      {hero}
      {wide ? (
        <View className="flex-row items-start gap-4">
          <View className="flex-[2] gap-4">{todayList}</View>
          <View className="flex-1 gap-4">
            {below}
            {comingUp}
          </View>
        </View>
      ) : (
        <>
          {todayList}
          {below}
          {comingUp}
        </>
      )}
    </Screen>
  );
}
