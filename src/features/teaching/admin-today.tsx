import { useState } from 'react';
import { View } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { formatDayLong } from '@/features/sessions/format';
import { useAdminTodayCounts, useAppNow, useAttendanceCounts, useSessions } from '@/features/sessions/queries';
import { activeFilterCount, filterSessions, type SessionFilterValues } from '@/features/sessions/teaching';

import { SessionFilters } from './session-filters';
import { TeachingSessionCard } from './teaching-session-card';

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <View className="min-w-[44%] flex-1 gap-1 rounded-lg border border-border bg-surface p-4" accessibilityLabel={`${label}: ${value ?? 0}`}>
      <Text variant="title">{value ?? '-'}</Text>
      <Text variant="muted">{label}</Text>
    </View>
  );
}

// Admin Home ("Today"): five counts and every session today, each listed once, with filters.
export function AdminToday() {
  const now = useAppNow();
  const today = now.data?.slice(0, 10) ?? '';
  const [filters, setFilters] = useState<SessionFilterValues>({});

  const counts = useAdminTodayCounts();
  const sessions = useSessions(['admin-today', today], (q) => q.eq('session_date', today).order('start_time'), Boolean(today), true);
  const attendance = useAttendanceCounts(today, today, Boolean(today));

  const all = sessions.data ?? [];
  const visible = filterSessions(all, filters);
  const filtered = activeFilterCount(filters) > 0;

  return (
    <Screen title={today ? `Today, ${formatDayLong(today)}` : 'Today'}>
      <View className="flex-row flex-wrap gap-3">
        <Stat value={counts.data?.sessions_today} label="Sessions today" />
        <Stat value={counts.data?.live_now} label="Live now" />
        <Stat value={counts.data?.upcoming} label="Upcoming" />
        <Stat value={counts.data?.finished} label="Finished" />
        <Stat value={counts.data?.rescheduled_or_cancelled} label="Rescheduled or cancelled" />
      </View>

      <SessionFilters sessions={all} value={filters} onChange={setFilters} />

      <Text variant="heading">{filtered ? `Sessions today (${visible.length} of ${all.length})` : `All sessions today (${all.length})`}</Text>
      <Text variant="muted">One row per session. Each session is listed once, even with many students enrolled.</Text>
      {sessions.isPending || now.isPending ? <Text variant="muted">Loading...</Text> : null}
      {sessions.isError ? <Text variant="error">Could not load the sessions for today.</Text> : null}
      {sessions.data && visible.length === 0 ? (
        <Card>
          <Text variant="muted">{all.length === 0 ? 'No sessions today.' : 'No sessions match these filters. Clear filters to see all.'}</Text>
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
