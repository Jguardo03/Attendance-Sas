import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Card, EmptyState, Grid, Screen, Text } from '@/components/ui';
import { addDays, formatDayLong, formatDayShort, startOfWeek, weekdayInitials } from '@/lib/dates';
import { TeachingSessionCard } from '@/features/teaching/teaching-session-card';
import { useAuth } from '@/providers/auth';

import { SessionCard } from './components/session-card';
import type { Session } from './format';
import { useAppNow, useAttendanceCounts, useMyAttendance, useSessions } from './queries';

function StepButton({ icon, label, onPress }: { icon: 'chevronLeft' | 'chevronRight'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="h-10 w-10 items-center justify-center rounded-button border border-border bg-surface active:opacity-80">
      <Icon name={icon} size={20} color="content" />
    </Pressable>
  );
}

// A lecturer's day: each session with its live figure ("18 of 24 checked in", "88%", "22 enrolled").
function TeachingDay({ sessions, first, last }: { sessions: Session[]; first: string; last: string }) {
  const counts = useAttendanceCounts(first, last, Boolean(first));
  return (
    <Grid>
      {sessions.map((session) => (
        <TeachingSessionCard key={session.session_id} session={session} counts={counts.data?.get(session.session_id)} />
      ))}
    </Grid>
  );
}

// Calendar tab for every role (Student UI pages 21 to 25): a week strip with the days as chips (today outlined, the
// chosen day solid blue, a dot when something is on), and the chosen day's sessions below. What each person sees is
// decided by row level security (a student sees their classes, a lecturer theirs, an admin all).
export function WeekCalendar() {
  const { can, claims } = useAuth();
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
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
  // The chosen day if it is in this week, else today if it is, else the first day of the week.
  const selected = picked && days.includes(picked) ? picked : days.includes(today) ? today : first;
  const forDay = (sessions.data ?? []).filter((session) => session.session_date === selected);
  const countOn = (day: string) => (sessions.data ?? []).filter((session) => session.session_date === day).length;

  return (
    <Screen title="Calendar">
      <Card>
        <View className="flex-row items-center justify-between gap-2">
          <StepButton icon="chevronLeft" label="Previous week" onPress={() => setOffset((value) => value - 1)} />
          <Text variant="card" className="flex-1 text-center">
            {first ? `${formatDayShort(first)} to ${formatDayShort(last)}` : 'Loading...'}
          </Text>
          <StepButton icon="chevronRight" label="Next week" onPress={() => setOffset((value) => value + 1)} />
        </View>
        <View className="flex-row gap-1.5">
          {days.map((day, index) => {
            const isSelected = day === selected;
            const isToday = day === today;
            const busy = countOn(day) > 0;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`${formatDayShort(day)}${isToday ? ' (today)' : ''}${busy ? `, ${countOn(day)} sessions` : ''}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setPicked(day)}
                className={`min-h-16 flex-1 items-center justify-center gap-0.5 rounded-block border active:opacity-80 ${isSelected ? 'border-primary bg-primary' : isToday ? 'border-primary bg-surface' : 'border-transparent bg-surface'}`}>
                <Text variant="label" className={isSelected ? 'text-primary-content' : ''}>
                  {weekdayInitials[index]}
                </Text>
                <Text className={`font-inter-bold ${isSelected ? 'text-primary-content' : ''}`}>{Number(day.slice(8, 10))}</Text>
                <View className={`h-1.5 w-1.5 rounded-full ${busy ? (isSelected ? 'bg-primary-content' : 'bg-primary') : 'bg-transparent'}`} aria-hidden />
              </Pressable>
            );
          })}
        </View>
        {offset !== 0 || selected !== today ? (
          <Button
            variant="ghost"
            label="This week"
            onPress={() => {
              setOffset(0);
              setPicked(null);
            }}
          />
        ) : null}
      </Card>

      {sessions.isError ? <Text variant="error">Could not load this week.</Text> : null}
      {selected ? (
        <View className="flex-row items-baseline justify-between">
          <Text variant="section">{selected === today ? `${formatDayLong(selected)} (today)` : formatDayLong(selected)}</Text>
          {sessions.data && forDay.length > 0 ? <Text variant="meta">{forDay.length} session{forDay.length === 1 ? '' : 's'}</Text> : null}
        </View>
      ) : null}
      {sessions.data && forDay.length === 0 ? (
        <Card>
          <EmptyState image="calendar" title="No sessions" message="Nothing is scheduled for this day." />
        </Card>
      ) : null}
      {isStudent ? (
        <Grid>
          {forDay.map((session) => (
            <SessionCard key={session.session_id} session={session} attendance={attendance.data?.get(session.session_id)} showMyAttendance />
          ))}
        </Grid>
      ) : (
        <TeachingDay sessions={forDay} first={first} last={last} />
      )}
    </Screen>
  );
}
