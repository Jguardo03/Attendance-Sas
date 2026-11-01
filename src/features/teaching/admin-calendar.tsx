import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { formatDayLong, formatDayShort } from '@/features/sessions/format';
import { useAppNow, useAttendanceCounts, useDayCounts, useSessions } from '@/features/sessions/queries';
import { filterSessions, type SessionFilterValues } from '@/features/sessions/teaching';
import { addDays, startOfWeek } from '@/lib/dates';

import { SessionFilters } from './session-filters';
import { TeachingSessionCard } from './teaching-session-card';

// Admin Calendar: a week strip with the number of sessions on each day. Tap a day to list its sessions,
// each once, with the same filters as Today.
export function AdminCalendar() {
  const now = useAppNow();
  const today = now.data?.slice(0, 10) ?? '';
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionFilterValues>({});

  const first = today ? addDays(startOfWeek(today), offset * 7) : '';
  const last = first ? addDays(first, 6) : '';
  const days = first ? Array.from({ length: 7 }, (_, index) => addDays(first, index)) : [];
  // The chosen day, or today when it is in this week, or the first day of the week.
  const day = picked && days.includes(picked) ? picked : days.includes(today) ? today : first;

  const dayCounts = useDayCounts(first, last);
  const sessions = useSessions(['admin-day', day], (q) => q.eq('session_date', day).order('start_time'), Boolean(day), true);
  const attendance = useAttendanceCounts(day, day, Boolean(day));
  const visible = filterSessions(sessions.data ?? [], filters);

  function move(weeks: number) {
    setOffset((value) => value + weeks);
    setPicked(null);
  }

  return (
    <Screen title="Calendar">
      <Card>
        <Text variant="heading">{first ? `${formatDayShort(first)} to ${formatDayShort(last)}` : 'Loading...'}</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button variant="secondary" label="‹ Previous" onPress={() => move(-1)} />
          </View>
          <View className="flex-1">
            <Button variant="secondary" label="This week" disabled={offset === 0} onPress={() => { setOffset(0); setPicked(null); }} />
          </View>
          <View className="flex-1">
            <Button variant="secondary" label="Next ›" onPress={() => move(1)} />
          </View>
        </View>
      </Card>

      <View className="flex-row flex-wrap gap-2">
        {days.map((date) => {
          const row = dayCounts.data?.get(date);
          const selected = date === day;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatDayShort(date)}, ${row?.sessions ?? 0} sessions`}
              onPress={() => setPicked(date)}
              className={`min-w-[22%] flex-1 items-center gap-1 rounded-md border px-2 py-3 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}>
              <Text variant="muted">{formatDayShort(date)}</Text>
              <Text>{row?.sessions ? `${row.sessions} session${Number(row.sessions) === 1 ? '' : 's'}` : 'None'}</Text>
            </Pressable>
          );
        })}
      </View>

      <SessionFilters sessions={sessions.data ?? []} value={filters} onChange={setFilters} />

      {day ? <Text variant="heading">{`${formatDayLong(day)} · ${visible.length} session${visible.length === 1 ? '' : 's'}`}</Text> : null}
      <Text variant="muted">Each session is listed once, even with many students enrolled.</Text>
      {sessions.isError ? <Text variant="error">Could not load this day.</Text> : null}
      {sessions.data && visible.length === 0 ? (
        <Card>
          <Text variant="muted">No sessions.</Text>
        </Card>
      ) : null}
      <View className="gap-3">
        {visible.map((session) => (
          <TeachingSessionCard key={session.session_id} session={session} counts={attendance.data?.get(session.session_id)} showLecturer />
        ))}
      </View>
    </Screen>
  );
}
