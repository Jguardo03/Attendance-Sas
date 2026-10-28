// Turns a database error into the "CRUD error" component content from the Admin wireframes.
// Messages are plain words; the raw error is logged and never shown.

export type DbErrorLike = { code?: string; message?: string; details?: string | null };

export type ErrorAction = 'open-existing' | 'view-booking' | 'view-where-used' | 'fix-field' | 'try-again';

export type FriendlyError = {
  title: string;
  message: string;
  action: ErrorAction;
  actionLabel: string;
  /** Form fields to mark, taken from the constraint name. */
  fields: string[];
  /** Constraint that fired, used to look up the conflicting record. */
  constraint?: string;
  conflict?: string;
};

type Context = { item: string; values?: Record<string, unknown> };

// One line per code: title, primary action, wording. `{item}` is replaced with the entity name.
const byCode: Record<string, { title: string; action: ErrorAction; actionLabel: string; message: string }> = {
  '23505': {
    title: '{Item} already exists',
    action: 'open-existing',
    actionLabel: 'Open existing',
    message: 'Another {item} already uses this value. Use a different value, or edit the existing {item}.',
  },
  '23P01': {
    title: '{Item} already booked',
    action: 'view-booking',
    actionLabel: 'View booking',
    message: 'This overlaps an existing booking. Choose another location or time.',
  },
  '23503': {
    title: '{Item} is still in use',
    action: 'view-where-used',
    actionLabel: 'View where used',
    message: 'Other records still use this {item}. Remove or change those first, then try again.',
  },
  '23514': {
    title: 'Value not allowed',
    action: 'fix-field',
    actionLabel: 'Fix field',
    message: 'One of the values is not allowed. Check the marked fields.',
  },
};

const fallback = {
  title: 'Could not save',
  action: 'try-again' as const,
  actionLabel: 'Try again',
  message: 'Something went wrong. Check the details and try again.',
};

// Adding a constraint to the database needs one line here so its fields get marked.
// `message` replaces the generic wording when the constraint says more than the code can.
export const constraintInfo: Record<string, { fields: string[]; title?: string; message?: string }> = {
  uq_role_name: { fields: ['name'], message: 'Role names must be unique. Use a different name or edit the existing role.' },
  uq_permissions_name: { fields: ['name'], message: 'Permission names must be unique.' },
  uq_email_parm_format: { fields: ['format'], message: 'This email format is already listed.' },
  uq_frequency_name: { fields: ['name'], message: 'Frequency names must be unique.' },
  uq_academic_period_name: { fields: ['name'], message: 'Period names must be unique.' },
  uq_class_name: { fields: ['name'], message: 'Class names must be unique.' },
  uq_users_email_lower: { fields: ['email'], message: 'Someone already has this email address.' },
  pk_users: { fields: ['id'], message: 'This ID is already taken.' },
  chk_users_id: { fields: ['id'], message: 'The ID must start with S, L or A followed by 1 to 7 digits.' },
  chk_academic_period_dates: { fields: ['start_date', 'finish_date'], message: 'The finish date must be after the start date.' },
  chk_frequency_interval_days: { fields: ['interval_days'], message: 'Days between sessions must be more than 0.' },
  fk_users_role_id: { fields: [], message: 'People still have this role. Move them to another role first.' },
  fk_class_schedule_academic_period_id: { fields: [], message: 'Schedules still use this period. Remove or move them first.' },
  fk_class_schedule_class_id: { fields: [], message: 'Schedules still use this class. Remove or move them first.' },
  fk_class_schedule_frequency_id: { fields: [], message: 'Schedules still use this frequency. Remove or move them first.' },
  fk_users_email_parm_id: { fields: [], message: 'People still use this email format. Move them first.' },
  // Phase 6: rooms, equipment, timetable
  uq_location_name: { fields: ['name'], message: 'Location names must be unique.' },
  uq_beacon_identity: { fields: ['uuid', 'major', 'minor'], message: 'A beacon with this UUID, major and minor already exists.' },
  pk_nfc_tags: { fields: ['nfc_uid'], message: 'This tag is already registered.' },
  chk_nfc_tags_nfc_uid: { fields: ['nfc_uid'], message: 'The tag UID must be 8, 14 or 20 hex characters.' },
  chk_beacon_major: { fields: ['major'], message: 'Major must be from 0 to 65535.' },
  chk_beacon_minor: { fields: ['minor'], message: 'Minor must be from 0 to 65535.' },
  chk_beacon_rssi_calibrated: { fields: ['rssi_calibrated'], message: 'Signal strength must be from -127 to 0.' },
  chk_schedule_times: { fields: ['start_time', 'end_time'], message: 'The end time must be after the start time.' },
  uq_schedule_location_slot: {
    fields: ['location_id', 'start_time', 'end_time', 'week_day'],
    title: 'Location already booked',
    message: 'This location is booked at that time in this period. Choose another location or time.',
  },
  uq_schedule_lecturer_slot: {
    fields: ['lecturer_id', 'start_time', 'end_time', 'week_day'],
    title: 'Lecturer already booked',
    message: 'This lecturer already teaches at that time in this period. Choose another lecturer or time.',
  },
  uq_enrollment_user_schedule: { fields: [], title: 'Already enrolled', message: 'This student is already enrolled in this schedule.' },
  uq_session_schedule_date: { fields: [], title: 'Session already exists', message: 'This schedule already has a session on that date.' },
  chk_session_override_times: { fields: [], message: 'The new end time must be after the new start time.' },
  fk_class_schedule_location_id: { fields: [], message: 'Schedules still use this location. Move or delete them first.' },
  fk_class_schedule_lecturer_id: { fields: [], message: 'Schedules still use this lecturer. Move or delete them first.' },
  fk_enrollment_class_schedule_id: { fields: [], message: 'Students are still enrolled in this schedule. Remove them first.' },
  fk_class_session_class_schedule_id: { fields: [], message: 'This schedule still has sessions with attendance. Remove those first.' },
};

export function constraintFromError(error: DbErrorLike): string | undefined {
  const text = `${error.message ?? ''} ${error.details ?? ''}`;
  return /constraint "([^"]+)"/.exec(text)?.[1];
}

function fill(template: string, item: string) {
  return template
    .replaceAll('{Item}', item.charAt(0).toUpperCase() + item.slice(1))
    .replaceAll('{item}', item.toLowerCase());
}

export function mapDbError(error: DbErrorLike, context: Context): FriendlyError {
  const entry = error.code ? byCode[error.code] : undefined;
  if (!entry) {
    console.warn('Unmapped database error', error);
    return { ...fallback, fields: [] };
  }
  const constraint = constraintFromError(error);
  const info = constraint ? constraintInfo[constraint] : undefined;
  // An exclusion clash names a booking, not a typed value; the screen looks that booking up itself.
  const conflictValue =
    error.code === '23P01' ? undefined : info?.fields.map((field) => context.values?.[field]).find((value) => value);
  return {
    title: info?.title ?? fill(entry.title, context.item),
    message: info?.message ?? fill(entry.message, context.item),
    action: entry.action,
    actionLabel: entry.actionLabel,
    fields: info?.fields ?? [],
    constraint,
    conflict: conflictValue ? `${context.item}: ${String(conflictValue)}` : undefined,
  };
}
