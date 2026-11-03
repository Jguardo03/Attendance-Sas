import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge, Text } from '@/components/ui';

import { formatDayShort, hhmm, sessionPill, type Session } from '../format';

// One line of "Coming up": a date block, the class, the time and room, and the status pill (Student UI, Home).
export function UpcomingRow({ session }: { session: Session }) {
  const router = useRouter();
  const pill = sessionPill(session.status);
  const [weekday, ...rest] = formatDayShort(session.session_date).split(' ');

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${session.class_name}, ${formatDayShort(session.session_date)}, ${pill.label}`}
      onPress={() => router.push(`/session/${session.session_id}`)}
      className="min-h-14 flex-row items-center gap-3 py-2 active:opacity-80">
      <View className="h-12 w-12 items-center justify-center rounded-block bg-primary-tint">
        <Text variant="label" className="text-primary">
          {weekday}
        </Text>
        <Text className="font-inter-bold text-primary">{rest[0]}</Text>
      </View>
      <View className="flex-1">
        <Text variant="card" numberOfLines={1}>
          {session.class_name}
        </Text>
        <Text variant="meta" numberOfLines={1}>
          {hhmm(session.start_time)}
          {session.location_name ? ` · ${session.location_name}` : ''}
        </Text>
      </View>
      <Badge label={pill.label} tone={pill.tone} dot={pill.dot} />
    </Pressable>
  );
}
