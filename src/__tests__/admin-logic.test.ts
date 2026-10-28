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
      { code: '23505', message: 'duplicate key value violates unique constraint "uq_role_name_ci"' },
      { item: 'role', values: { name: 'Lecturer' } },
    );
    expect(result.title).toBe('Role already exists');
    expect(result.actionLabel).toBe('Open existing');
    expect(result.fields).toEqual(['name']);
    expect(result.conflict).toBe('role: Lecturer');
    expect(result.message).toContain('already exists');
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

describe('Phase 6 entities', () => {
  const schedules = findEntity('schedules')!;
  const beacons = findEntity('beacons')!;
  const tags = findEntity('nfc-tags')!;

  it('never asks for columns that clients cannot read', () => {
    // location.qr_secret_seed and nfc_tags.payload_token have no client privilege; `*` would fail.
    expect(findEntity('locations')!.select).not.toContain('*');
    expect(findEntity('locations')!.select).not.toContain('qr_secret_seed');
    expect(tags.select).not.toContain('*');
    expect(tags.select).not.toContain('payload_token');
    expect(tags.idColumn).toBe('nfc_uid');
  });

  it('validates schedule times and requires a location', () => {
    const base = { ...initialValues(schedules), class_id: '1', academic_period_id: '1', frequency_id: '1', lecturer_id: 'L1000001', location_id: '1' };
    expect(validateValues(schedules, { ...base, start_time: '9am', end_time: '11:00' }, true)).toEqual({ start_time: 'Use the 24 hour format HH:MM' });
    expect(validateValues(schedules, { ...base, start_time: '11:00', end_time: '09:00' }, true)).toEqual({ end_time: 'The end time must be after the start time' });
    expect(validateValues(schedules, { ...base, start_time: '09:00', end_time: '11:00', location_id: '' }, true)).toEqual({ location_id: 'Required' });
    expect(validateValues(schedules, { ...base, start_time: '09:00', end_time: '11:00' }, true)).toEqual({});
  });

  it('builds a schedule payload with numbers and the weekday as a number', () => {
    const payload = buildPayload(
      schedules,
      { class_id: '2', academic_period_id: '3', frequency_id: '1', lecturer_id: 'L1000001', week_day: '3', start_time: '09:00', end_time: '11:00', location_id: '5' },
      true,
    );
    expect(payload).toEqual({ class_id: 2, academic_period_id: 3, frequency_id: 1, lecturer_id: 'L1000001', week_day: 3, start_time: '09:00', end_time: '11:00', location_id: 5 });
  });

  it('shows stored times as HH:MM in the edit form', () => {
    expect(initialValues(schedules, { start_time: '09:00:00', end_time: '10:30:00', week_day: 2 }).start_time).toBe('09:00');
  });

  it('checks beacon ranges, the UUID format and allows an unassigned beacon', () => {
    const values = { uuid: 'not-a-uuid', major: '70000', minor: '1', rssi_calibrated: '5', location_id: '' };
    expect(validateValues(beacons, values, true)).toEqual({
      uuid: 'Use the UUID format 8-4-4-4-12',
      major: 'Use a value from 0 to 65535',
      rssi_calibrated: 'Use a value from -127 to 0',
    });
    const ok = { uuid: 'f7826da6-4fa2-4e98-8024-bc5b71e0893e', major: '1', minor: '2', rssi_calibrated: '-59', location_id: '' };
    expect(validateValues(beacons, ok, true)).toEqual({});
    expect(buildPayload(beacons, ok, true)).toEqual({ uuid: ok.uuid, major: 1, minor: 2, rssi_calibrated: -59, location_id: null });
  });

  it('checks and uppercases the NFC tag UID', () => {
    expect(validateValues(tags, { nfc_uid: '04a1b2', location_id: '' }, true)).toEqual({ nfc_uid: 'Use 8, 14 or 20 hex characters (0 to 9, A to F)' });
    expect(validateValues(tags, { nfc_uid: '04a1b2c3', location_id: '' }, true)).toEqual({});
    expect(buildPayload(tags, { nfc_uid: '04a1b2c3', location_id: '2' }, true)).toEqual({ nfc_uid: '04A1B2C3', location_id: 2 });
  });

  it('asks before moving a beacon or tag to another location', () => {
    const field = beacons.fields.find((candidate) => candidate.name === 'location_id')!;
    expect(field.confirmChange!('Room 1.01', 'Room 2.02')).toContain('Move this beacon from Room 1.01 to Room 2.02');
  });
});

describe('booking clash errors', () => {
  it('names a location clash and marks the room and time fields', () => {
    const result = mapDbError(
      { code: '23P01', message: 'conflicting key value violates exclusion constraint "uq_schedule_location_slot"' },
      { item: 'schedule' },
    );
    expect(result.title).toBe('Location already booked');
    expect(result.actionLabel).toBe('View booking');
    expect(result.fields).toEqual(['location_id', 'start_time', 'end_time', 'week_day']);
    expect(result.conflict).toBeUndefined();
  });

  it('names a lecturer clash separately', () => {
    const result = mapDbError(
      { code: '23P01', message: 'violates exclusion constraint "uq_schedule_lecturer_slot"' },
      { item: 'schedule' },
    );
    expect(result.title).toBe('Lecturer already booked');
    expect(result.fields[0]).toBe('lecturer_id');
  });

  it('explains a duplicate beacon identity and a location still in use', () => {
    expect(mapDbError({ code: '23505', message: 'violates unique constraint "uq_beacon_identity"' }, { item: 'beacon' }).message).toContain('already exists');
    const inUse = mapDbError({ code: '23503', message: 'violates foreign key constraint "fk_class_schedule_location_id"' }, { item: 'location' });
    expect(inUse.title).toBe('Location is still in use');
    expect(inUse.message).toContain('Schedules still use this location');
  });
});

describe('case-insensitive names', () => {
  it('flags every unique name field so Open existing ignores capitals', () => {
    for (const key of ['periods', 'classes', 'frequencies', 'permissions', 'roles', 'locations']) {
      const field = findEntity(key)!.fields.find((candidate) => candidate.name === 'name');
      expect({ key, caseInsensitive: field?.caseInsensitive }).toEqual({ key, caseInsensitive: true });
    }
  });

  it('maps each name index to a clear message on the name field', () => {
    const cases: [string, string][] = [
      ['uq_role_name_ci', 'role'],
      ['uq_permissions_name_ci', 'permission'],
      ['uq_class_name_ci', 'class'],
      ['uq_academic_period_name_ci', 'period'],
      ['uq_frequency_name_ci', 'frequency'],
      ['uq_location_name_ci', 'location'],
    ];
    for (const [constraint, item] of cases) {
      const result = mapDbError({ code: '23505', message: `duplicate key value violates unique constraint "${constraint}"` }, { item });
      expect(result.fields).toEqual(['name']);
      expect(result.message).toContain('whatever the capital letters');
    }
  });
});
