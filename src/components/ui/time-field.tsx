import { View } from 'react-native';

import { hourOptions, minuteOptions, splitTime } from '@/lib/dates';

import { Dropdown } from './dropdown';
import { Text } from './text';

// 24 hour time picker: an hour list (00 to 23) and a minute list (every 5 minutes). Value is "HH:MM" or ''.
// Not the browser's own time input, because that shows 12 or 24 hours depending on the computer's language.
export function TimeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (time: string) => void;
  error?: string;
}) {
  const { hour, minute } = splitTime(value);

  return (
    <View className="gap-1">
      <Text variant="muted">{label}</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Dropdown
            accessibilityLabel={`${label} hour`}
            value={hour}
            placeholder="HH"
            options={hourOptions.map((option) => ({ value: option, label: option }))}
            // Picking an hour first fills in :00 so the time is complete.
            onChange={(next) => onChange(`${next}:${minute || '00'}`)}
          />
        </View>
        <View className="flex-1">
          <Dropdown
            accessibilityLabel={`${label} minute`}
            value={minute}
            placeholder="MM"
            options={minuteOptions(5, minute).map((option) => ({ value: option, label: option }))}
            onChange={(next) => onChange(`${hour || '09'}:${next}`)}
          />
        </View>
      </View>
      {error ? <Text variant="error">{error}</Text> : null}
    </View>
  );
}
