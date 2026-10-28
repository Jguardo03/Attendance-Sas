import { Pressable, View } from 'react-native';

import { Text } from './text';

type Option = { value: string; label: string };

// Small choice list shown as buttons. Meant for short lists (status, role, email format).
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
      <Text variant="muted">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              className={`rounded-full border px-3 py-2 ${selected ? 'border-primary bg-primary' : 'border-border bg-surface'}`}>
              <Text className={selected ? 'text-primary-content' : 'text-content'}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text variant="error">{error}</Text> : null}
    </View>
  );
}
