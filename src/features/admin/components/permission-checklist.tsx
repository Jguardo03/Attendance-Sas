import { View } from 'react-native';

import { Card, Checkbox, Text } from '@/components/ui';

import {
  groupPermissions,
  selectedCount,
  toggleGroup,
  togglePermission,
  type PermissionRow,
} from '../permission-groups';

// Permissions grouped Attendance / Classes and sessions / Admin; ticking a group selects all of it.
export function PermissionChecklist({
  permissions,
  selected,
  onChange,
}: {
  permissions: PermissionRow[];
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  return (
    <View className="gap-3">
      <Text variant="muted">Permissions ({selected.length} selected)</Text>
      {groupPermissions(permissions).map((group) => {
        const count = selectedCount(selected, group);
        return (
          <Card key={group.title}>
            <Checkbox
              label={`${group.title} (${count} of ${group.permissions.length})`}
              checked={count === group.permissions.length}
              partial={count > 0 && count < group.permissions.length}
              onChange={() => onChange(toggleGroup(selected, group))}
            />
            {group.permissions.map((permission) => (
              <View key={permission.id} className="pl-6">
                <Checkbox
                  label={permission.description ? `${permission.name}: ${permission.description}` : permission.name}
                  checked={selected.includes(permission.id)}
                  onChange={() => onChange(togglePermission(selected, permission.id))}
                />
              </View>
            ))}
          </Card>
        );
      })}
    </View>
  );
}
