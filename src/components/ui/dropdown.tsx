import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/icon';
import { shadows } from '@/theme/tokens';

import { fieldBorder, fieldBox } from './field';
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
      {label ? (
        <Text variant="meta" className="font-inter-medium">
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        className={`${fieldBox} ${open ? 'border-primary' : fieldBorder(error)}`}>
        <Text className={`flex-1 ${selected ? '' : 'text-content-muted'}`}>{selected?.label ?? placeholder}</Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={20} color="contentMuted" />
      </Pressable>
      {open ? (
        <View className="max-h-60 overflow-hidden rounded-block border border-border bg-surface" style={{ boxShadow: shadows.card }}>
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
                  className={`min-h-11 flex-row items-center justify-between px-3 py-2 ${isSelected ? 'bg-primary-tint' : ''}`}>
                  <Text className={`flex-1 ${isSelected ? 'font-inter-semibold text-primary' : ''}`}>{option.label}</Text>
                  {isSelected ? <Icon name="check" size={18} color="primary" /> : null}
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
