import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ProgressBar } from '@/components/charts';
import { Badge, Text } from '@/components/ui';
import { hhmm, lecturerName, sessionPill, type Session } from '@/features/sessions/format';
import { attended, attendancePercent, movedNote, type SessionCounts } from '@/features/sessions/teaching';
import { useIsMedium } from '@/features/shell/nav';
import { RING_THRESHOLD } from '@/lib/ring';
import { shadows } from '@/theme/tokens';

// Written out in full so the styling tool can see the class names. Each class keeps the same colour.
const bars = ['bg-primary', 'bg-warning', 'bg-success'] as const;

// The attendance of one session in an admin list: a bar and "18/24", or the reason there is no figure
// ("Not counted", "Moved to 10:00"). The bar is blue until the session is over, then green or red like the rings.
function Attendance({ session, counts }: { session: Session; counts?: SessionCounts }) {
  const note = movedNote(session);
  if (note) return <Text variant="meta">{note}</Text>;
  if (!counts) return null;
  const percent = attendancePercent(counts);
  const tone = session.status !== 'finished' ? 'primary' : percent < RING_THRESHOLD ? 'danger' : 'success';
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1">
        <ProgressBar value={attended(counts)} max={counts.enrolled} tone={tone} label={`${session.class_name} attendance`} />
      </View>
      <Text variant="card">{`${attended(counts)}/${counts.enrolled}`}</Text>
    </View>
  );
}

// Every session of a day, one compact row each, since an admin sees many classes. From 768 px it is a table
// (time, class, lecturer, location, status, attendance) with a header; on a phone each session is a small bordered card.
export function AdminSessionList({ sessions, counts }: { sessions: Session[]; counts?: Map<number, SessionCounts> }) {
  const router = useRouter();
  const wide = useIsMedium();
  if (sessions.length === 0) return null;

  const rows = sessions.map((session) => {
    const pill = sessionPill(session.status);
    const lecturer = lecturerName(session);
    const bar = <View className={`w-1 self-stretch rounded-full ${bars[session.class_id % bars.length]}`} aria-hidden />;
    const press = {
      accessibilityRole: 'link' as const,
      accessibilityLabel: `${session.class_name}, ${pill.label}`,
      onPress: () => router.push(`/session/${session.session_id}`),
    };
    const attendance = <Attendance session={session} counts={counts?.get(session.session_id)} />;

    return wide ? (
      <Pressable key={session.session_id} {...press} className="min-h-12 flex-row items-center gap-3 border-t border-border px-4 py-2 active:opacity-80">
        <Text className="w-32 font-inter-bold">
          {hhmm(session.start_time)} <Text variant="meta">to {hhmm(session.end_time)}</Text>
        </Text>
        {bar}
        <Text variant="card" className="flex-[2]">
          {session.class_name}
        </Text>
        <View className="flex-[1.5] flex-row items-center gap-2">
          <Avatar name={lecturer} id={session.lecturer_id} size={28} />
          <Text className="flex-1">{lecturer}</Text>
        </View>
        <Text variant="meta" className="flex-1">
          {session.location_name ?? ''}
        </Text>
        <View className="w-28 flex-row">
          <Badge label={pill.label} tone={pill.tone} dot={pill.dot} />
        </View>
        <View className="w-44">{attendance}</View>
      </Pressable>
    ) : (
      <Pressable key={session.session_id} {...press} className="flex-row gap-3 rounded-block border border-border bg-surface px-3 py-2.5 active:opacity-80">
        {bar}
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="card" className="flex-1">
              {session.class_name}
            </Text>
            <Badge label={pill.label} tone={pill.tone} dot={pill.dot} />
          </View>
          <Text variant="meta">{`${hhmm(session.start_time)} to ${hhmm(session.end_time)}${lecturer ? ` · ${lecturer}` : ''}`}</Text>
          {attendance}
        </View>
      </Pressable>
    );
  });

  if (!wide) return <View className="gap-2">{rows}</View>;
  return (
    <View className="overflow-hidden rounded-card bg-surface" style={{ boxShadow: shadows.card }}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Text variant="label" className="w-32">
          TIME
        </Text>
        <View className="w-1" />
        <Text variant="label" className="flex-[2]">
          CLASS
        </Text>
        <Text variant="label" className="flex-[1.5]">
          LECTURER
        </Text>
        <Text variant="label" className="flex-1">
          LOCATION
        </Text>
        <Text variant="label" className="w-28">
          STATUS
        </Text>
        <Text variant="label" className="w-44">
          ATTENDANCE
        </Text>
      </View>
      {rows}
    </View>
  );
}
