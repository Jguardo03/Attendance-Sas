import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Checkbox, Text, Loading } from '@/components/ui';

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
      <Text variant="meta" className="font-inter-medium">Location *</Text>
      {!ready ? <Text variant="muted">Choose the period, day and times to see which locations are free.</Text> : null}
      {ready && availability.isPending ? <Loading label="Checking locations..." /> : null}
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
            className={`min-h-14 flex-row items-center justify-between gap-2 rounded-block border px-3 py-2 active:opacity-80 ${selected ? 'border-primary bg-primary-tint' : 'border-border bg-surface'}`}>
            <Text className={`flex-1 ${booked ? 'text-content-muted' : ''}`}>{row.location_name}</Text>
            {booked ? <Badge label={`Booked: ${row.booked_class}`} tone="neutral" /> : <Badge label={selected ? 'Selected' : 'Free'} tone={selected ? 'upcoming' : 'success'} />}
          </Pressable>
        );
      })}
      {error ? <Text variant="error">{error}</Text> : null}
    </View>
  );
}
