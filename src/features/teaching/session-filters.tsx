import { View } from 'react-native';

import { Dropdown, TextField } from '@/components/ui';
import type { Session } from '@/features/sessions/format';
import { distinctValues, lecturerLabel, statusLabel, type SessionFilterValues } from '@/features/sessions/teaching';

// "All lecturers" is both the empty choice and the placeholder, so the filters need no titles.
const choices = (all: string, values: string[]) => [{ value: '', label: all }, ...values.map((value) => ({ value, label: value }))];

// A search box for the class name and Lecturer / Location / Status filters, all in one row (wrapping on a phone), for
// the admin Today and Calendar lists. The choices are what the loaded sessions actually contain, so picking one never
// gives an empty result by accident.
export function SessionFilters({
  sessions,
  value,
  onChange,
  search,
  onSearch,
}: {
  sessions: Session[];
  value: SessionFilterValues;
  onChange: (next: SessionFilterValues) => void;
  search: string;
  onSearch: (next: string) => void;
}) {
  const set = (key: keyof SessionFilterValues) => (next: string) => onChange({ ...value, [key]: next || undefined });
  const field = 'min-w-[45%] flex-1 md:w-48 md:min-w-0 md:flex-none';

  return (
    <View className="flex-row flex-wrap items-start gap-3">
      <View className="w-full md:min-w-64 md:w-auto md:flex-1">
        <TextField label="Search class" hideLabel value={search} onChangeText={onSearch} placeholder="Search class name" autoCapitalize="none" />
      </View>
      <View className={field}>
        <Dropdown accessibilityLabel="Lecturer" value={value.lecturer ?? ''} options={choices('All lecturers', distinctValues(sessions, lecturerLabel))} onChange={set('lecturer')} />
      </View>
      <View className={field}>
        <Dropdown accessibilityLabel="Location" value={value.location_name ?? ''} options={choices('All locations', distinctValues(sessions, (s) => s.location_name))} onChange={set('location_name')} />
      </View>
      <View className={field}>
        <Dropdown accessibilityLabel="Status" value={value.status ?? ''} options={choices('All statuses', distinctValues(sessions, statusLabel))} onChange={set('status')} />
      </View>
    </View>
  );
}
