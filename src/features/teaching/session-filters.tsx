import { View } from 'react-native';

import { Button, Collapsible, Dropdown } from '@/components/ui';
import type { Session } from '@/features/sessions/format';
import {
  activeFilterCount,
  distinctValues,
  lecturerLabel,
  statusLabel,
  type SessionFilterValues,
} from '@/features/sessions/teaching';

const choices = (values: string[]) => [{ value: '', label: 'All' }, ...values.map((value) => ({ value, label: value }))];

// Class / Lecturer / Location / Status filters for the admin Today and Calendar lists. Closed by default so the
// session list stays on screen on a phone; the title shows how many filters are on. The choices are what the
// loaded sessions actually contain, so picking one never gives an empty result by accident.
export function SessionFilters({
  sessions,
  value,
  onChange,
}: {
  sessions: Session[];
  value: SessionFilterValues;
  onChange: (next: SessionFilterValues) => void;
}) {
  const set = (key: keyof SessionFilterValues) => (next: string) => onChange({ ...value, [key]: next || undefined });
  const count = activeFilterCount(value);

  return (
    <View className="gap-3">
      <Collapsible title={count > 0 ? `Filters (${count})` : 'Filters'}>
        <Dropdown label="Class" value={value.class_name ?? ''} options={choices(distinctValues(sessions, (s) => s.class_name))} onChange={set('class_name')} />
        <Dropdown label="Lecturer" value={value.lecturer ?? ''} options={choices(distinctValues(sessions, lecturerLabel))} onChange={set('lecturer')} />
        <Dropdown label="Location" value={value.location_name ?? ''} options={choices(distinctValues(sessions, (s) => s.location_name))} onChange={set('location_name')} />
        <Dropdown label="Status" value={value.status ?? ''} options={choices(distinctValues(sessions, statusLabel))} onChange={set('status')} />
      </Collapsible>
      {count > 0 ? <Button variant="secondary" label={`Clear filters (${count})`} onPress={() => onChange({})} /> : null}
    </View>
  );
}
