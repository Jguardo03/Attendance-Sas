import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { addMonths, formatLong, monthGrid, monthNames, parseIso, toIso, todayIso, weekdayInitials } from '@/lib/dates';
import { shadows } from '@/theme/tokens';

import { fieldBorder, fieldBox } from './field';
import { Text } from './text';

function Step({ label, onPress, hint }: { label: string; onPress: () => void; hint: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={hint} onPress={onPress} className="h-10 w-10 items-center justify-center rounded-button border border-border active:opacity-80">
      <Text className="font-inter-semibold text-primary">{label}</Text>
    </Pressable>
  );
}

// Date picker as a calendar that opens under the field. Value is ISO text (YYYY-MM-DD), or '' when empty.
// `anchor` is the month shown first when there is no value yet (a finish date opens on the start date).
export function DateField({
  label,
  value,
  onChange,
  anchor,
  error,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  anchor?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);
  const start = selected ?? parseIso(anchor) ?? parseIso(todayIso())!;
  const [view, setView] = useState({ y: start.y, m: start.m });

  function move(months: number) {
    setView((current) => addMonths(current.y, current.m, months));
  }

  return (
    <View className="gap-1">
      <Text variant="meta" className="font-inter-medium">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          if (!open) {
            const target = parseIso(value) ?? parseIso(anchor) ?? parseIso(todayIso())!;
            setView({ y: target.y, m: target.m });
          }
          setOpen((current) => !current);
        }}
        className={`${fieldBox} ${open ? 'border-primary' : fieldBorder(error)}`}>
        <Text className={`flex-1 ${selected ? '' : 'text-content-muted'}`}>{selected ? formatLong(selected) : 'Choose a date'}</Text>
        <Icon name="calendar" size={20} color="contentMuted" />
      </Pressable>

      {open ? (
        <View className="gap-2 rounded-block border border-border bg-surface p-3" style={{ boxShadow: shadows.card }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row gap-1">
              <Step label="«" hint="Previous year" onPress={() => move(-12)} />
              <Step label="‹" hint="Previous month" onPress={() => move(-1)} />
            </View>
            <Text variant="heading">
              {monthNames[view.m - 1]} {view.y}
            </Text>
            <View className="flex-row gap-1">
              <Step label="›" hint="Next month" onPress={() => move(1)} />
              <Step label="»" hint="Next year" onPress={() => move(12)} />
            </View>
          </View>

          <View className="flex-row">
            {weekdayInitials.map((day) => (
              <View key={day} className="flex-1 items-center py-1">
                <Text variant="muted">{day}</Text>
              </View>
            ))}
          </View>
          {monthGrid(view.y, view.m).map((week, index) => (
            <View key={index} className="flex-row">
              {week.map((day, cell) => {
                const iso = day ? toIso({ y: view.y, m: view.m, d: day }) : '';
                const isSelected = iso !== '' && iso === value;
                return (
                  <View key={cell} className="flex-1 items-center py-0.5">
                    {day ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={formatLong({ y: view.y, m: view.m, d: day })}
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => {
                          onChange(iso);
                          setOpen(false);
                        }}
                        className={`h-10 w-10 items-center justify-center rounded-full ${isSelected ? 'bg-primary' : ''}`}>
                        <Text className={isSelected ? 'font-inter-semibold text-primary-content' : ''}>{day}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}
      {error ? <Text variant="error">{error}</Text> : null}
    </View>
  );
}
