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
export const constraintInfo: Record<string, { fields: string[]; message?: string }> = {
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
  const conflictValue = info?.fields.map((field) => context.values?.[field]).find((value) => value);
  return {
    title: fill(entry.title, context.item),
    message: info?.message ?? fill(entry.message, context.item),
    action: entry.action,
    actionLabel: entry.actionLabel,
    fields: info?.fields ?? [],
    constraint,
    conflict: conflictValue ? `${context.item}: ${String(conflictValue)}` : undefined,
  };
}
