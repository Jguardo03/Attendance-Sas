export type PermissionRow = { id: number; name: string; description: string | null };

export type PermissionGroup = { title: string; permissions: PermissionRow[] };

// Groups follow the Roles wireframe: Attendance / Classes and sessions / Admin (everything else).
export function groupPermissions(permissions: PermissionRow[]): PermissionGroup[] {
  const groups: PermissionGroup[] = [
    { title: 'Attendance', permissions: [] },
    { title: 'Classes and sessions', permissions: [] },
    { title: 'Admin', permissions: [] },
  ];
  for (const permission of permissions) {
    const prefix = permission.name.split('.')[0];
    const group = prefix === 'attendance' ? groups[0] : prefix === 'classes' || prefix === 'sessions' ? groups[1] : groups[2];
    group.permissions.push(permission);
  }
  return groups.filter((group) => group.permissions.length > 0);
}

export function selectedCount(selected: number[], group: PermissionGroup): number {
  return group.permissions.filter((permission) => selected.includes(permission.id)).length;
}

// "Tick a group to select all": selects the whole group, or clears it when it is already all selected.
export function toggleGroup(selected: number[], group: PermissionGroup): number[] {
  const ids = group.permissions.map((permission) => permission.id);
  const allSelected = ids.every((id) => selected.includes(id));
  if (allSelected) return selected.filter((id) => !ids.includes(id));
  return [...new Set([...selected, ...ids])];
}

export function togglePermission(selected: number[], id: number): number[] {
  return selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
}

// What to write to role_permission to move from the saved set to the chosen set.
export function diffPermissions(saved: number[], chosen: number[]) {
  return {
    toAdd: chosen.filter((id) => !saved.includes(id)),
    toRemove: saved.filter((id) => !chosen.includes(id)),
  };
}
