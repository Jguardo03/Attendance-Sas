import { View } from 'react-native';

import { SegmentedTabs, Text } from '@/components/ui';
import { useIsMedium } from '@/features/shell/nav';

// The Active period | Previous tabs of the Classes screens. From 768 px the tabs are small and the period name and class
// count sit on the same line at the right; on a phone the tabs fill the row and the screen shows its own headings.
export function ClassesToolbar({
  options,
  value,
  onChange,
  summary,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  summary?: string;
}) {
  const medium = useIsMedium();
  return (
    <View className="flex-row flex-wrap items-center justify-between gap-3">
      <View className="w-full md:w-auto">
        <SegmentedTabs label="Show" value={value} options={options} onChange={onChange} compact />
      </View>
      {medium && summary ? <Text variant="meta">{summary}</Text> : null}
    </View>
  );
}

export const classCount = (count: number) => `${count} class${count === 1 ? '' : 'es'}`;
