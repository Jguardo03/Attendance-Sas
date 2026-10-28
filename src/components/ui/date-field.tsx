import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { addMonths, formatLong, monthGrid, monthNames, parseIso, toIso, todayIso, weekdayInitials } from '@/lib/dates';

import { Text } from './text';

function Step({ label, onPress, hint }: { label: string; onPress: () => void; hint: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={hint} onPress={onPress} className="h-10 w-10 items-center justify-center rounded-md border border-border">
      <Text>{label}</Text>
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
      <Text variant="muted">{label}</Text>
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
        className="flex-row items-center justify-between rounded-md border border-border bg-surface px-3 py-3">
        <Text className={selected ? '' : 'text-content-muted'}>{selected ? formatLong(selected) : 'Choose a date'}</Text>
        <Text variant="muted">{open ? '▴' : '▾'}</Text>
      </Pressable>

      {open ? (
        <View className="gap-2 rounded-md border border-border bg-surface p-3">
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
                        <Text className={isSelected ? 'text-primary-content' : ''}>{day}</Text>
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
