import { useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Card, EmptyState, Screen, Text, Loading } from '@/components/ui';
import { formatDayLong } from '@/features/sessions/format';
import { useAdminTodayCounts, useAppNow, useAttendanceCounts, useSessions } from '@/features/sessions/queries';
import { activeFilterCount, filterSessions, type SessionFilterValues } from '@/features/sessions/teaching';
import { shadows, type ColorToken } from '@/theme/tokens';

import { AdminSessionList } from './admin-session-list';
import { SessionFilters } from './session-filters';

// The icon tile of each count, written out in full so the styling tool can see the class names.
const tones = {
  primary: { color: 'primary', tint: 'bg-primary-tint' },
  muted: { color: 'contentMuted', tint: 'bg-surface-muted' },
  success: { color: 'success', tint: 'bg-success-tint' },
  warning: { color: 'warning', tint: 'bg-warning-tint' },
} as const satisfies Record<string, { color: ColorToken; tint: string }>;

// One count: the icon in a tile on the left, the figure and its label on the right.
function Stat({ value, label, icon, tone }: { value: number | undefined; label: string; icon: IconName; tone: keyof typeof tones }) {
  const { color, tint } = tones[tone];
  return (
    <View className="min-w-[45%] flex-1 flex-row items-center gap-3 rounded-card bg-surface p-4 md:min-w-[17%]" style={{ boxShadow: shadows.card }} accessibilityLabel={`${label}: ${value ?? 0}`}>
      <View className={`h-12 w-12 items-center justify-center rounded-block ${tint}`}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View className="flex-1">
        <Text className="font-inter-bold text-title">{value ?? '-'}</Text>
        <Text variant="meta">{label}</Text>
      </View>
    </View>
  );
}

// Admin Home ("Today", Admin UI pages 1 to 3): five counts and every session today, each listed once, with search and
// filters.
export function AdminToday() {
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
        <Stat icon="calendar" tone="primary" value={counts.data?.sessions_today} label="Sessions today" />
        <Stat icon="eye" tone="primary" value={counts.data?.live_now} label="Live now" />
        <Stat icon="clock" tone="muted" value={counts.data?.upcoming} label="Upcoming" />
        <Stat icon="checkCircle" tone="success" value={counts.data?.finished} label="Finished" />
        <Stat icon="warning" tone="warning" value={counts.data?.rescheduled_or_cancelled} label="Rescheduled or cancelled" />
      </View>

      <SessionFilters sessions={all} value={filters} onChange={setFilters} search={search} onSearch={setSearch} />

      <View className="flex-row items-baseline justify-between gap-2">
        <Text variant="section">{filtered ? `Sessions today (${visible.length} of ${all.length})` : `All sessions today (${all.length})`}</Text>
        <Text variant="meta">Each listed once</Text>
      </View>
      {sessions.isPending || now.isPending ? <Loading /> : null}
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
      <AdminSessionList sessions={visible} counts={attendance.data} />
    </Screen>
  );
}
