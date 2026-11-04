import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ClassArtwork } from '@/components/class-artwork';
import { Icon, type IconName } from '@/components/icon';
import { Text } from '@/components/ui';
import { shadows } from '@/theme/tokens';

// The class card from 768 px up (Student UI Classes, desktop): the artwork on top, the name with the percentage ring, a
// few icon rows, then a line with the lecturer (or a note) and a status pill. Phones keep the compact row card.
export function ClassTile({
  classId,
  name,
  onPress,
  ring,
  lines,
  lecturer,
  lecturerId,
  note,
  pill,
}: {
  classId: number;
  name: string;
  onPress: () => void;
  ring: ReactNode;
  lines: { icon: IconName; text: string }[];
  lecturer?: string;
  lecturerId?: string | null;
  note?: string;
  pill?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={name}
      onPress={onPress}
      className="gap-3 rounded-card bg-surface p-3 active:opacity-90"
      style={{ boxShadow: shadows.card }}>
      <View className="h-28 overflow-hidden rounded-block bg-cream">
        <ClassArtwork classId={classId} fit="whole" />
      </View>
      <View className="flex-row items-center gap-3 px-1">
        <Text variant="card" className="flex-1">
          {name}
        </Text>
        {ring}
      </View>
      <View className="gap-1.5 px-1">
        {lines.map((line) => (
          <View key={line.text} className="flex-row items-center gap-2">
            <Icon name={line.icon} size={16} color="contentMuted" />
            <Text variant="meta" className="flex-1">
              {line.text}
            </Text>
          </View>
        ))}
      </View>
      <View className="flex-row items-center gap-2 border-t border-border px-1 pt-3">
        {lecturer ? <Avatar name={lecturer} id={lecturerId ?? undefined} size={28} /> : null}
        <Text variant="meta" className="flex-1">
          {lecturer || note}
        </Text>
        {pill}
      </View>
    </Pressable>
  );
}
