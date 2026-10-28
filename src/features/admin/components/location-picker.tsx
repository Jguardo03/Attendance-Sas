import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Checkbox, Text } from '@/components/ui';

import { listAvailability } from '../api';
import type { FormValues } from '../form';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// Every location with Free or Booked: <class> for the chosen period, day and time (schedules form).
// The database overlap rule is still what decides; this only shows the answer before saving.
export function LocationPicker({
  values,
  value,
  excludeScheduleId,
  error,
  onChange,
}: {
  values: FormValues;
  value: string;
  excludeScheduleId?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [freeOnly, setFreeOnly] = useState(false);
  const ready =
    Boolean(values.academic_period_id) &&
    Boolean(values.week_day) &&
    timeRegex.test(String(values.start_time)) &&
    timeRegex.test(String(values.end_time)) &&
    String(values.end_time) > String(values.start_time);

  const availability = useQuery({
    queryKey: ['admin', 'availability', values.academic_period_id, values.week_day, values.start_time, values.end_time, excludeScheduleId],
    enabled: ready,
    queryFn: () =>
      listAvailability({
        periodId: Number(values.academic_period_id),
        weekDay: Number(values.week_day),
        start: String(values.start_time),
        end: String(values.end_time),
        excludeScheduleId: excludeScheduleId ? Number(excludeScheduleId) : undefined,
      }),
  });

  const rows = (availability.data ?? []).filter((row) => !freeOnly || !row.booked_class);

  return (
    <View className="gap-2" accessibilityRole="radiogroup" accessibilityLabel="Location">
      <Text variant="muted">Location *</Text>
      {!ready ? <Text variant="muted">Choose the period, day and times to see which locations are free.</Text> : null}
      {ready && availability.isPending ? <Text variant="muted">Checking locations...</Text> : null}
      {ready && availability.isError ? <Text variant="error">Could not check availability.</Text> : null}
      {ready ? <Checkbox label="Show free locations only" checked={freeOnly} onChange={() => setFreeOnly((current) => !current)} /> : null}
      {rows.map((row) => {
        const booked = Boolean(row.booked_class);
        const selected = String(row.location_id) === value;
        return (
          <Pressable
            key={row.location_id}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: booked }}
            disabled={booked}
            onPress={() => onChange(String(row.location_id))}
            className={`flex-row items-center justify-between rounded-md border px-3 py-3 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}>
            <Text className={booked ? 'text-content-muted' : ''}>{row.location_name}</Text>
            <Text variant="muted">{booked ? `Booked: ${row.booked_class}` : selected ? 'Selected' : 'Free'}</Text>
          </Pressable>
        );
      })}
      {error ? <Text variant="error">{error}</Text> : null}
    </View>
  );
}
