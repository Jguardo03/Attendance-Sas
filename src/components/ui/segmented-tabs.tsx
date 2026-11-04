import { Pressable, View } from 'react-native';

import { Text } from './text';

type Option = { value: string; label: string };

// Round tabs to switch a list between two or three views (Active period | Previous, Previous | Upcoming).
// The chosen one is solid blue and the others are white with a hairline; the label is always shown. `compact` keeps them
// small and left-aligned from 768 px instead of stretching across the row (the Classes screens, with a label beside them).
export function SegmentedTabs({ label, options, value, onChange, compact = false }: { label: string; options: Option[]; value: string; onChange: (value: string) => void; compact?: boolean }) {
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
            className={`min-h-11 flex-1 items-center justify-center rounded-full border px-4 active:opacity-80 ${compact ? 'md:min-h-9 md:flex-none md:px-5' : ''} ${selected ? 'border-primary bg-primary' : 'border-border bg-surface'}`}>
            <Text className={`font-inter-semibold ${selected ? 'text-primary-content' : 'text-primary'}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
