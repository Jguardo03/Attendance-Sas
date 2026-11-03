import { useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Grid, Screen, Text, useColumns } from '@/components/ui';
import { formatDayLong } from '@/features/sessions/format';
import { useAdminTodayCounts, useAppNow, useAttendanceCounts, useSessions } from '@/features/sessions/queries';
import { activeFilterCount, filterSessions, type SessionFilterValues } from '@/features/sessions/teaching';
import { shadows } from '@/theme/tokens';

import { SessionFilters } from './session-filters';
import { TeachingSessionCard } from './teaching-session-card';

// Written out in full so the styling tool can see the class names.
const valueTone = { default: 'text-content', primary: 'text-primary', warning: 'text-warning-content' } as const;

function Stat({ value, label, tone = 'default' }: { value: number | undefined; label: string; tone?: keyof typeof valueTone }) {
  return (
    <View className="min-w-[28%] flex-1 gap-0.5 md:min-w-[17%] rounded-card bg-surface p-4" style={{ boxShadow: shadows.card }} accessibilityLabel={`${label}: ${value ?? 0}`}>
      <Text className={`font-inter-bold text-title ${valueTone[tone]}`}>{value ?? '-'}</Text>
      <Text variant="meta">{label}</Text>
    </View>
  );
}

// Admin Home ("Today", Admin UI pages 1 to 3): five counts and every session today, each listed once, with search and
// filters.
export function AdminToday() {
  const columns = useColumns();
  const now = useAppNow();
  const today = now.data?.slice(0, 10) ?? '';
  const [filters, setFilters] = useState<SessionFilterValues>({});
  const [search, setSearch] = useState('');

  const counts = useAdminTodayCounts();
  const sessions = useSessions(['admin-today', today], (q) => q.eq('session_date', today).order('start_time'), Boolean(today), true);
  const attendance = useAttendanceCounts(today, today, Boolean(today));

  const all = sessions.data ?? [];
  const visible = filterSessions(all, filters, search);
  const filtered = activeFilterCount(filters) > 0 || search.trim() !== '';

  const header = (
    <View>
      <Text variant="meta">{today ? formatDayLong(today) : ' '}</Text>
      <Text variant="title">Today</Text>
    </View>
  );

  return (
    <Screen title={today ? `Today, ${formatDayLong(today)}` : 'Today'} header={header}>
      <View className="flex-row flex-wrap gap-3">
        <Stat value={counts.data?.sessions_today} label="Sessions today" />
        <Stat value={counts.data?.live_now} label="Live now" tone="primary" />
        <Stat value={counts.data?.upcoming} label="Upcoming" />
        <Stat value={counts.data?.finished} label="Finished" />
        <Stat value={counts.data?.rescheduled_or_cancelled} label="Rescheduled or cancelled" tone="warning" />
      </View>

      <SessionFilters sessions={all} value={filters} onChange={setFilters} search={search} onSearch={setSearch} />

      <View className="flex-row items-baseline justify-between gap-2">
        <Text variant="section">{filtered ? `Sessions today (${visible.length} of ${all.length})` : `All sessions today (${all.length})`}</Text>
        <Text variant="meta">Each listed once</Text>
      </View>
      <Text variant="meta">One row per session. Each session is listed once, even with many students enrolled.</Text>
      {sessions.isPending || now.isPending ? <Text variant="muted">Loading...</Text> : null}
      {sessions.isError ? <Text variant="error">Could not load the sessions for today.</Text> : null}
      {sessions.data && visible.length === 0 ? (
        <Card>
          <EmptyState
            image="calendar"
            title={all.length === 0 ? 'No sessions today' : 'No sessions match'}
            message={all.length === 0 ? 'No sessions today.' : 'No sessions match these filters. Clear filters to see all.'}
          />
        </Card>
      ) : null}
      <Grid columns={columns}>
        {visible.map((session) => (
          <TeachingSessionCard key={session.session_id} session={session} counts={attendance.data?.get(session.session_id)} showLecturer />
        ))}
      </Grid>
    </Screen>
  );
}
