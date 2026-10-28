import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from './text';

type Option = { value: string; label: string };

// A choice list that is closed until tapped. For long lists (classes, periods, hours) where
// the button style of Select would take the whole screen.
export function Dropdown({
  label,
  accessibilityLabel,
  value,
  options,
  onChange,
  placeholder = 'Choose',
  error,
}: {
  label?: string;
  accessibilityLabel?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View className="gap-1">
      {label ? <Text variant="muted">{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        className="flex-row items-center justify-between rounded-md border border-border bg-surface px-3 py-3">
        <Text className={selected ? '' : 'text-content-muted'}>{selected?.label ?? placeholder}</Text>
        <Text variant="muted">{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View className="max-h-60 rounded-md border border-border bg-surface">
          <ScrollView nestedScrollEnabled>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`px-3 py-3 ${isSelected ? 'bg-primary/10' : ''}`}>
                  <Text>{isSelected ? `✓ ${option.label}` : option.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {error ? <Text variant="error">{error}</Text> : null}
    </View>
  );
}
