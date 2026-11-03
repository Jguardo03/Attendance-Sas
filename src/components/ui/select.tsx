import { Pressable, View } from 'react-native';

import { Text } from './text';

type Option = { value: string; label: string };

// Small choice list shown as round buttons. Meant for short lists (status, role, email format).
export function Select({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <View className="gap-1" accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text variant="meta" className="font-inter-medium">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              className={`min-h-11 justify-center rounded-full border px-4 active:opacity-80 ${selected ? 'border-primary bg-primary' : 'border-border bg-surface'}`}>
              <Text className={`font-inter-medium ${selected ? 'text-primary-content' : 'text-content'}`}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text variant="error">{error}</Text> : null}
    </View>
  );
}
