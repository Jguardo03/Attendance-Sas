import {
  diffPermissions,
  groupPermissions,
  selectedCount,
  toggleGroup,
  togglePermission,
} from '@/features/admin/permission-groups';
import { findEntity } from '@/features/admin/entities';
import { buildPayload, initialValues, validateValues } from '@/features/admin/form';
import { constraintFromError, mapDbError } from '@/lib/db-errors';

describe('mapDbError', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('maps a duplicate role name to "Role already exists" and marks the name field', () => {
    const result = mapDbError(
      { code: '23505', message: 'duplicate key value violates unique constraint "uq_role_name"' },
      { item: 'role', values: { name: 'Lecturer' } },
    );
    expect(result.title).toBe('Role already exists');
    expect(result.actionLabel).toBe('Open existing');
    expect(result.fields).toEqual(['name']);
    expect(result.conflict).toBe('role: Lecturer');
    expect(result.message).toContain('unique');
  });

  it('maps a delete blocked by schedules to "still in use"', () => {
    const result = mapDbError(
      { code: '23503', message: 'violates foreign key constraint "fk_class_schedule_academic_period_id" on table "class_schedule"' },
      { item: 'period' },
    );
    expect(result.title).toBe('Period is still in use');
    expect(result.actionLabel).toBe('View where used');
    expect(result.message).toContain('Schedules');
  });

  it('maps a check violation to "Value not allowed" and marks both dates', () => {
    const result = mapDbError(
      { code: '23514', message: 'violates check constraint "chk_academic_period_dates"' },
      { item: 'period' },
    );
    expect(result.title).toBe('Value not allowed');
    expect(result.fields).toEqual(['start_date', 'finish_date']);
  });

  it('maps an exclusion violation to "already booked"', () => {
    expect(mapDbError({ code: '23P01' }, { item: 'location' }).title).toBe('Location already booked');
  });

  it('falls back to "Could not save" and never shows the raw message', () => {
    const result = mapDbError({ code: 'XX000', message: 'secret internal detail' }, { item: 'role' });
    expect(result.title).toBe('Could not save');
    expect(result.message).not.toContain('secret');
    expect(console.warn).toHaveBeenCalled();
  });

  it('reads the constraint name from the message or details', () => {
    expect(constraintFromError({ details: 'violates constraint "uq_x"' })).toBe('uq_x');
    expect(constraintFromError({ message: 'nothing here' })).toBeUndefined();
  });
});

describe('permission checklist logic', () => {
  const permissions = [
    { id: 1, name: 'attendance.view_own', description: null },
    { id: 2, name: 'attendance.check_in', description: null },
    { id: 3, name: 'classes.view_all', description: null },
    { id: 4, name: 'sessions.manage_own', description: null },
    { id: 5, name: 'admin.access', description: null },
    { id: 6, name: 'users.manage', description: null },
  ];
  const groups = groupPermissions(permissions);

  it('groups permissions as Attendance, Classes and sessions, Admin', () => {
    expect(groups.map((group) => group.title)).toEqual(['Attendance', 'Classes and sessions', 'Admin']);
    expect(groups[1].permissions.map((permission) => permission.id)).toEqual([3, 4]);
    expect(groups[2].permissions.map((permission) => permission.id)).toEqual([5, 6]);
  });

  it('selects a whole group, then clears it when already fully selected', () => {
    const selected = toggleGroup([5], groups[0]);
    expect(selected.sort()).toEqual([1, 2, 5]);
    expect(selectedCount(selected, groups[0])).toBe(2);
    expect(toggleGroup(selected, groups[0])).toEqual([5]);
  });

  it('completes a partly selected group instead of clearing it', () => {
    expect(toggleGroup([1], groups[0]).sort()).toEqual([1, 2]);
  });

  it('toggles a single permission', () => {
    expect(togglePermission([1], 2)).toEqual([1, 2]);
    expect(togglePermission([1, 2], 2)).toEqual([1]);
  });

  it('computes what to add and remove when saving a role', () => {
    expect(diffPermissions([1, 2, 3], [2, 3, 4])).toEqual({ toAdd: [4], toRemove: [1] });
  });
});

describe('form validation and payload', () => {
  const periods = findEntity('periods')!;
  const users = findEntity('users')!;

  it('requires the required fields and checks date and number formats', () => {
    expect(validateValues(periods, initialValues(periods), true)).toEqual({
      name: 'Required',
      start_date: 'Required',
      finish_date: 'Required',
    });
    const errors = validateValues(periods, { ...initialValues(periods), name: 'T1', start_date: '1/2/2027', finish_date: '2027-04-10' }, true);
    expect(errors).toEqual({ start_date: 'Use the format YYYY-MM-DD' });
    const frequency = findEntity('frequencies')!;
    expect(validateValues(frequency, { name: 'Weekly', interval_days: 'x' }, true)).toEqual({ interval_days: 'Enter a whole number' });
  });

  it('checks the user ID pattern and that the email matches the chosen format', () => {
    const base = { ...initialValues(users), first_name: 'A', last_name: 'B', role_id: '1', email_parm_id: '1' };
    expect(validateValues(users, { ...base, id: 'X12', email: 'a@mailinator.com' }, true, { emailFormat: '@mailinator.com' })).toEqual({
      id: 'Use S, L or A followed by 1 to 7 digits',
    });
    expect(validateValues(users, { ...base, id: 'S1', email: 'a@gmail.com' }, true, { emailFormat: '@mailinator.com' })).toEqual({
      email: 'Email must end with @mailinator.com',
    });
    expect(validateValues(users, { ...base, id: 'S1', email: 'a@mailinator.com' }, true, { emailFormat: '@mailinator.com' })).toEqual({});
  });

  it('builds a payload with numbers, nulls and without create-only fields on edit', () => {
    const frequency = findEntity('frequencies')!;
    expect(buildPayload(frequency, { name: ' Weekly ', interval_days: '7' }, true)).toEqual({ name: 'Weekly', interval_days: 7 });
    const classes = findEntity('classes')!;
    expect(buildPayload(classes, { name: 'Maths', description: '' }, true)).toEqual({ name: 'Maths', description: null });
    const edit = buildPayload(users, { id: 'S1', first_name: 'A', last_name: 'B', email: 'x@y', email_parm_id: '2', role_id: '3', overrides: {} }, false);
    expect(edit).toEqual({ first_name: 'A', last_name: 'B', role_id: 3 });
  });
});
