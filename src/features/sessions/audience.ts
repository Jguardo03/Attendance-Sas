// Which version of the shared screens a person gets. Decided from permissions, never from the role's name,
// so a renamed role or an override still works. Admin wins over lecturer, which wins over student.
export type Audience = 'admin' | 'lecturer' | 'student' | 'none';

export function audienceOf(can: (permissionKey: string) => boolean): Audience {
  if (can('admin.access')) return 'admin';
  if (can('sessions.manage_own')) return 'lecturer';
  if (can('attendance.check_in')) return 'student';
  return 'none';
}
