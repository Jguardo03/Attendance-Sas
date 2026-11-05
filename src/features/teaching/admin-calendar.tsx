import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, EmptyState, Screen, Text } from '@/components/ui';
import { formatDayLong, formatDayShort } from '@/features/sessions/format';
import { useAppNow, useAttendanceCounts, useDayCounts, useSessions } from '@/features/sessions/queries';
import { StepButton } from '@/features/sessions/week-calendar';
import { filterSessions, type SessionFilterValues } from '@/features/sessions/teaching';
import { addDays, startOfWeek, weekdayInitials } from '@/lib/dates';

import { AdminSessionList } from './admin-session-list';
import { SessionFilters } from './session-filters';

// Admin Calendar: a week strip with the number of sessions on each day. Tap a day to list its sessions,
// each once, with the same filters as Today.
export function AdminCalendar() {
  const now = useAppNow();
  const today = now.data?.slice(0, 10) ?? '';
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionFilterValues>({});
  const [search, setSearch] = useState('');

  const first = today ? addDays(startOfWeek(today), offset * 7) : '';
  const last = first ? addDays(first, 6) : '';
  const days = first ? Array.from({ length: 7 }, (_, index) => addDays(first, index)) : [];
  // The chosen day, or today when it is in this week, or the first day of the week.
  const day = picked && days.includes(picked) ? picked : days.includes(today) ? today : first;

  const dayCounts = useDayCounts(first, last);
  const sessions = useSessions(['admin-day', day], (q) => q.eq('session_date', day).order('start_time'), Boolean(day), true);
  const attendance = useAttendanceCounts(day, day, Boolean(day));
  const visible = filterSessions(sessions.data ?? [], filters, search);

  function move(weeks: number) {
    setOffset((value) => value + weeks);
    setPicked(null);
  }

  return (
    <Screen title="Calendar">
      <Card>
        <View className="flex-row items-center justify-between gap-2">
          <StepButton icon="chevronLeft" label="Previous week" onPress={() => move(-1)} />
          <Text variant="card" className="flex-1 text-center">
            {first ? `${formatDayShort(first)} to ${formatDayShort(last)}` : 'Loading...'}
          </Text>
          <StepButton icon="chevronRight" label="Next week" onPress={() => move(1)} />
        </View>
        <View className="flex-row gap-1.5">
          {days.map((date, index) => {
            const row = dayCounts.data?.get(date);
            const selected = date === day;
            const busy = Number(row?.sessions ?? 0) > 0;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${formatDayShort(date)}, ${row?.sessions ?? 0} sessions`}
                onPress={() => setPicked(date)}
                className={`min-h-16 flex-1 items-center justify-center gap-0.5 rounded-block border active:opacity-80 ${selected ? 'border-primary bg-primary' : date === today ? 'border-primary bg-surface' : 'border-transparent bg-surface'}`}>
                <Text variant="label" className={selected ? 'text-primary-content' : ''}>
                  {weekdayInitials[index]}
                </Text>
                <Text className={`font-inter-bold ${selected ? 'text-primary-content' : ''}`}>{Number(date.slice(8, 10))}</Text>
                <Text variant="label" className={selected ? 'text-primary-content' : ''}>
                  {busy ? String(row?.sessions) : ' '}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {offset !== 0 || day !== today ? (
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

      <SessionFilters sessions={sessions.data ?? []} value={filters} onChange={setFilters} search={search} onSearch={setSearch} />

      <View className="flex-row items-baseline justify-between gap-2">
        {day ? <Text variant="section">{`${formatDayLong(day)} · ${visible.length} session${visible.length === 1 ? '' : 's'}`}</Text> : null}
        <Text variant="meta">Each listed once</Text>
      </View>
      {sessions.isError ? <Text variant="error">Could not load this day.</Text> : null}
      {sessions.data && visible.length === 0 ? (
        <Card>
          <EmptyState image="calendar" title="No sessions" message="Nothing is scheduled for this day." />
        </Card>
      ) : null}
      <AdminSessionList sessions={visible} counts={attendance.data} />
    </Screen>
  );
}
