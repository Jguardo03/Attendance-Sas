import { Pressable, View } from 'react-native';

import { Text } from './text';

type Option = { value: string; label: string };

// Round tabs to switch a list between two or three views (Active period | Previous, Previous | Upcoming).
// The chosen one is solid blue and the others are white with a hairline; the label is always shown.
export function SegmentedTabs({ label, options, value, onChange }: { label: string; options: Option[]; value: string; onChange: (value: string) => void }) {
  return (
    <View className="flex-row gap-2" accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={`min-h-10 flex-1 items-center justify-center rounded-full border px-4 active:opacity-80 ${selected ? 'border-primary bg-primary' : 'border-border bg-surface'}`}>
            <Text className={`font-inter-semibold ${selected ? 'text-primary-content' : 'text-primary'}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
