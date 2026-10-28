import { View } from 'react-native';

import { Card, Select, Text } from '@/components/ui';

import type { PermissionRow } from '../permission-groups';

export type Overrides = Record<string, 'grant' | 'deny'>;

const choices = [
  { value: 'default', label: 'From role' },
  { value: 'grant', label: 'Grant' },
  { value: 'deny', label: 'Deny' },
];

// Per-user permission overrides on top of the role. A deny beats a grant.
export function OverridesEditor({
  permissions,
  value,
  onChange,
}: {
  permissions: PermissionRow[];
  value: Overrides;
  onChange: (next: Overrides) => void;
}) {
  function set(id: number, choice: string) {
    const next = { ...value };
    if (choice === 'default') delete next[String(id)];
    else next[String(id)] = choice as 'grant' | 'deny';
    onChange(next);
  }

  return (
    <Card title="Permission overrides">
      <Text variant="muted">Grant adds a permission, deny removes it, whatever the role says. Deny wins.</Text>
      <View className="gap-3">
        {permissions.map((permission) => (
          <Select
            key={permission.id}
            label={permission.name}
            value={value[String(permission.id)] ?? 'default'}
            options={choices}
            onChange={(choice) => set(permission.id, choice)}
          />
        ))}
      </View>
    </Card>
  );
}
