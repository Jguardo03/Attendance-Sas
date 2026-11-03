import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Collapsible, Dropdown, Text, TextField } from '@/components/ui';
import type { Session } from '@/features/sessions/format';
import {
  activeFilterCount,
  distinctValues,
  lecturerLabel,
  statusLabel,
  type SessionFilterValues,
} from '@/features/sessions/teaching';

const choices = (values: string[]) => [{ value: '', label: 'All' }, ...values.map((value) => ({ value, label: value }))];

const chipLabels: Record<keyof SessionFilterValues, string> = { class_name: 'Class', lecturer: 'Lecturer', location_name: 'Location', status: 'Status' };

// A search box for the class name, then Class / Lecturer / Location / Status filters for the admin Today and Calendar
// lists. The filters are closed by default so the session list stays on screen on a phone; each one that is on shows as
// a chip you can remove, and the title says how many are on. The choices are what the loaded sessions actually contain,
// so picking one never gives an empty result by accident.
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
  const count = activeFilterCount(value);
  const on = (Object.keys(chipLabels) as (keyof SessionFilterValues)[]).filter((key) => value[key]);

  return (
    <View className="gap-3">
      <TextField label="Search class" value={search} onChangeText={onSearch} placeholder="Search class name" autoCapitalize="none" />
      <Collapsible title={count > 0 ? `Filters (${count})` : 'Filters'}>
        <Dropdown label="Class" value={value.class_name ?? ''} options={choices(distinctValues(sessions, (s) => s.class_name))} onChange={set('class_name')} />
        <Dropdown label="Lecturer" value={value.lecturer ?? ''} options={choices(distinctValues(sessions, lecturerLabel))} onChange={set('lecturer')} />
        <Dropdown label="Location" value={value.location_name ?? ''} options={choices(distinctValues(sessions, (s) => s.location_name))} onChange={set('location_name')} />
        <Dropdown label="Status" value={value.status ?? ''} options={choices(distinctValues(sessions, statusLabel))} onChange={set('status')} />
      </Collapsible>
      {on.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {on.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${chipLabels[key]} filter`}
              onPress={() => set(key)('')}
              className="min-h-9 flex-row items-center gap-1.5 rounded-full bg-primary-tint px-3 active:opacity-80">
              <Text variant="label" className="text-primary">{`${chipLabels[key]}: ${value[key]}`}</Text>
              <Icon name="close" size={14} color="primary" />
            </Pressable>
          ))}
        </View>
      ) : null}
      {count > 0 ? <Button variant="secondary" label={`Clear filters (${count})`} onPress={() => onChange({})} /> : null}
    </View>
  );
}
