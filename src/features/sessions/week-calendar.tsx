import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { addDays, formatDayShort, startOfWeek } from '@/lib/dates';
import { useAuth } from '@/providers/auth';

import { SessionCard } from './components/session-card';
import { useAppNow, useMyAttendance, useSessions } from './queries';

// Calendar tab for every role: one week at a time, sessions grouped by day. What each person sees is decided by
// row level security (a student sees their classes, a lecturer theirs, an admin all).
export function WeekCalendar() {
  const { can, claims } = useAuth();
  const [offset, setOffset] = useState(0);
  const now = useAppNow();
  const today = now.data?.slice(0, 10) ?? '';
  const first = today ? addDays(startOfWeek(today), offset * 7) : '';
  const last = first ? addDays(first, 6) : '';

  const sessions = useSessions(
    ['week', first],
    (q) => q.gte('session_date', first).lte('session_date', last).order('session_date').order('start_time'),
    Boolean(first),
    true,
  );
  const isStudent = can('attendance.check_in');
  const attendance = useMyAttendance(isStudent ? claims?.appUserId : null, (sessions.data ?? []).map((session) => session.session_id));

  const days = first ? Array.from({ length: 7 }, (_, index) => addDays(first, index)) : [];

  return (
    <Screen title="Calendar">
      <Card>
        <Text variant="heading">{first ? `${formatDayShort(first)} to ${formatDayShort(last)}` : 'Loading...'}</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button variant="secondary" label="‹ Previous" onPress={() => setOffset((value) => value - 1)} />
          </View>
          <View className="flex-1">
            <Button variant="secondary" label="This week" disabled={offset === 0} onPress={() => setOffset(0)} />
          </View>
          <View className="flex-1">
            <Button variant="secondary" label="Next ›" onPress={() => setOffset((value) => value + 1)} />
          </View>
        </View>
      </Card>

      {sessions.isError ? <Text variant="error">Could not load this week.</Text> : null}
      {days.map((day) => {
        const forDay = (sessions.data ?? []).filter((session) => session.session_date === day);
        return (
          <View key={day} className="gap-2">
            <Text variant="heading">{day === today ? `${formatDayShort(day)} (today)` : formatDayShort(day)}</Text>
            {sessions.data && forDay.length === 0 ? <Text variant="muted">No sessions.</Text> : null}
            {forDay.map((session) => (
              <SessionCard key={session.session_id} session={session} attendance={attendance.data?.get(session.session_id)} showMyAttendance={isStudent} />
            ))}
          </View>
        );
      })}
    </Screen>
  );
}
