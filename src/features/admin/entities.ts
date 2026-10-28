// One definition per Admin entity. The generic list, details and form screens read these, so adding
// an entity means adding an entry here, not a new screen.

export type Row = Record<string, any>;

export type FieldDef = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select' | 'permissions' | 'overrides' | 'location-picker';
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  /** Options loaded from a table (for example the role or email format of a user). */
  optionsFrom?: {
    table: string;
    value: string;
    label: string;
    order: string;
    /** Columns to load when the label is built from several (default: value and label). */
    select?: string;
    format?: (row: Row) => string;
    like?: { column: string; pattern: string };
  };
  /** Format check on top of the type, with the message shown on the field. */
  pattern?: { regex: RegExp; message: string };
  /** A number that may be negative (for example the beacon signal strength). */
  signed?: boolean;
  uppercase?: boolean;
  /** A fixed list whose value is stored as a number (weekday). */
  asNumber?: boolean;
  /** Label of a "none" choice, for a foreign key that may be empty (an unassigned beacon). */
  allowEmpty?: string;
  /** When editing, asks for confirmation before an existing value changes. Receives the old and new labels. */
  confirmChange?: (from: string, to: string) => string;
  /** Cannot change after creation (a user's ID and email are tied to their sign-in account). */
  createOnly?: boolean;
  defaultValue?: string;
};

export type EntityDef = {
  key: string;
  label: string;
  singular: string;
  table: string;
  /** Column that identifies a row (default `id`; NFC tags use their UID). */
  idColumn?: string;
  /** Permission that opens the screens. RLS is the real enforcement. */
  permission: string;
  select: string;
  orderBy: string;
  searchColumns: string[];
  /** Search over text built from the row (including joined names); used when columns are not enough. */
  searchText?: (row: Row) => string;
  columns: { label: string; value: (row: Row) => string }[];
  title: (row: Row) => string;
  fields: FieldDef[];
  /** Filter chips over the loaded rows. Without `options`, the distinct values found are used. */
  filter?: { label: string; value: (row: Row) => string; options?: string[] };
  /** Not offered where the database does not allow it (users have no delete grant). */
  canDelete?: boolean;
  /** Read-only attributes shown on the details screen, in addition to the form fields. */
  readOnly?: { label: string; value: (row: Row) => string }[];
  /** Details show only `readOnly` (for entities whose fields are ids or need joined names). */
  detailsFromReadOnly?: boolean;
};

const dateTime = (value: unknown) => (value ? new Date(String(value)).toLocaleString() : '');
const audit: EntityDef['readOnly'] = [
  { label: 'Created', value: (row) => dateTime(row.created_at) },
  { label: 'Updated', value: (row) => dateTime(row.updated_at) },
];

const countOf = (row: Row, relation: string) => String(row[relation]?.[0]?.count ?? 0);

export const rowId = (entity: EntityDef, row: Row) => String(row[entity.idColumn ?? 'id']);

export const weekDays = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '7', label: 'Sun' },
];
export const dayName = (value: unknown) => weekDays.find((day) => day.value === String(value))?.label ?? '';
export const hhmm = (value: unknown) => String(value ?? '').slice(0, 5);
const uuidPattern = {
  regex: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  message: 'Use the UUID format 8-4-4-4-12',
};

export const entities: EntityDef[] = [
  {
    key: 'periods',
    label: 'Periods',
    singular: 'period',
    table: 'academic_period',
    permission: 'periods.manage',
    select: '*',
    orderBy: 'start_date',
    searchColumns: ['name'],
    filter: { label: 'Status', value: (row) => row.status, options: ['planning', 'active', 'finished'] },
    columns: [
      { label: 'Status', value: (row) => row.status },
      { label: 'From', value: (row) => `${row.start_date} to ${row.finish_date}` },
    ],
    title: (row) => row.name,
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'start_date', label: 'Start date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
      { name: 'finish_date', label: 'Finish date', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        defaultValue: 'planning',
        options: [
          { value: 'planning', label: 'Planning' },
          { value: 'active', label: 'Active' },
          { value: 'finished', label: 'Finished' },
        ],
      },
    ],
    readOnly: [{ label: 'ID', value: (row) => String(row.id) }, ...audit],
  },
  {
    key: 'classes',
    label: 'Classes',
    singular: 'class',
    table: 'class',
    permission: 'classes.manage',
    select: '*',
    orderBy: 'name',
    searchColumns: ['name', 'description'],
    columns: [{ label: 'Description', value: (row) => row.description ?? '' }],
    title: (row) => row.name,
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
    readOnly: [{ label: 'ID', value: (row) => String(row.id) }, ...audit],
  },
  {
    key: 'schedules',
    label: 'Schedules',
    singular: 'schedule',
    table: 'class_schedule',
    permission: 'classes.manage',
    select:
      '*, class(name), location(name), lecturer:users!fk_class_schedule_lecturer_id(first_name, last_name), academic_period(name), frequency(name)',
    orderBy: 'week_day',
    searchColumns: [],
    searchText: (row) => `${row.class?.name ?? ''} ${row.location?.name ?? ''} ${row.lecturer?.last_name ?? ''}`,
    filter: { label: 'Day', value: (row) => dayName(row.week_day), options: weekDays.map((day) => day.label) },
    columns: [
      { label: 'When', value: (row) => `${dayName(row.week_day)} ${hhmm(row.start_time)} to ${hhmm(row.end_time)}` },
      { label: 'Location', value: (row) => row.location?.name ?? '' },
      { label: 'Lecturer', value: (row) => `${row.lecturer?.first_name ?? ''} ${row.lecturer?.last_name ?? ''}` },
      { label: 'Period', value: (row) => row.academic_period?.name ?? '' },
      { label: 'Frequency', value: (row) => row.frequency?.name ?? '' },
    ],
    title: (row) => row.class?.name ?? 'Schedule',
    fields: [
      { name: 'class_id', label: 'Class', type: 'select', required: true, optionsFrom: { table: 'class', value: 'id', label: 'name', order: 'name' } },
      {
        name: 'academic_period_id',
        label: 'Period',
        type: 'select',
        required: true,
        optionsFrom: { table: 'academic_period', value: 'id', label: 'name', order: 'start_date' },
      },
      {
        name: 'frequency_id',
        label: 'Frequency',
        type: 'select',
        required: true,
        optionsFrom: { table: 'frequency', value: 'id', label: 'name', order: 'interval_days' },
      },
      {
        name: 'lecturer_id',
        label: 'Lecturer',
        type: 'select',
        required: true,
        optionsFrom: {
          table: 'users',
          value: 'id',
          label: 'id',
          order: 'id',
          select: 'id, first_name, last_name',
          format: (row) => `${row.id} ${row.first_name} ${row.last_name}`,
          like: { column: 'id', pattern: 'L%' },
        },
      },
      { name: 'week_day', label: 'Day', type: 'select', required: true, asNumber: true, defaultValue: '1', options: weekDays },
      { name: 'start_time', label: 'Start time', type: 'time', required: true, placeholder: '09:00' },
      { name: 'end_time', label: 'End time', type: 'time', required: true, placeholder: '11:00' },
      { name: 'location_id', label: 'Location', type: 'location-picker', required: true },
    ],
    detailsFromReadOnly: true,
    readOnly: [
      { label: 'When', value: (row) => `${dayName(row.week_day)} ${hhmm(row.start_time)} to ${hhmm(row.end_time)}` },
      { label: 'Location', value: (row) => row.location?.name ?? '' },
      { label: 'Lecturer', value: (row) => `${row.lecturer?.first_name ?? ''} ${row.lecturer?.last_name ?? ''}` },
      { label: 'Period', value: (row) => row.academic_period?.name ?? '' },
      { label: 'Frequency', value: (row) => row.frequency?.name ?? '' },
      { label: 'ID', value: (row) => String(row.id) },
      ...audit,
    ],
  },
  {
    key: 'locations',
    label: 'Locations',
    singular: 'location',
    table: 'location',
    permission: 'locations.manage',
    // Not `*`: clients have no privilege on the QR secret column, so asking for it fails.
    select: 'id, name, qr_enabled, created_at, updated_at',
    orderBy: 'name',
    searchColumns: ['name'],
    filter: { label: 'QR check-in', value: (row) => (row.qr_enabled ? 'On' : 'Off'), options: ['On', 'Off'] },
    columns: [{ label: 'QR check-in', value: (row) => (row.qr_enabled ? 'On' : 'Off') }],
    title: (row) => row.name,
    fields: [{ name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Room 1.01' }],
    readOnly: [{ label: 'ID', value: (row) => String(row.id) }, ...audit],
  },
  {
    key: 'beacons',
    label: 'Beacons',
    singular: 'beacon',
    table: 'beacon',
    permission: 'locations.manage',
    select: '*, location(name)',
    orderBy: 'id',
    searchColumns: ['uuid'],
    searchText: (row) => `${row.uuid} ${row.major} ${row.minor} ${row.location?.name ?? ''}`,
    filter: { label: 'Status', value: (row) => (row.location_id ? 'Assigned' : 'Spare'), options: ['Assigned', 'Spare'] },
    columns: [
      { label: 'Major / minor', value: (row) => `${row.major} / ${row.minor}` },
      { label: 'Location', value: (row) => row.location?.name ?? 'Not assigned' },
    ],
    title: (row) => `Beacon ${String(row.uuid).slice(0, 8)}`,
    fields: [
      { name: 'uuid', label: 'UUID', type: 'text', required: true, placeholder: '8-4-4-4-12 hex', pattern: uuidPattern },
      { name: 'major', label: 'Major (0 to 65535)', type: 'number', required: true },
      { name: 'minor', label: 'Minor (0 to 65535)', type: 'number', required: true },
      { name: 'rssi_calibrated', label: 'Signal at 1 m (-127 to 0)', type: 'number', required: true, signed: true, placeholder: '-59' },
      {
        name: 'location_id',
        label: 'Location',
        type: 'select',
        allowEmpty: 'Not assigned',
        optionsFrom: { table: 'location', value: 'id', label: 'name', order: 'name' },
        confirmChange: (from, to) => `Move this beacon from ${from} to ${to}? ${from} will no longer have it.`,
      },
    ],
    detailsFromReadOnly: true,
    readOnly: [
      { label: 'UUID', value: (row) => row.uuid },
      { label: 'Major', value: (row) => String(row.major) },
      { label: 'Minor', value: (row) => String(row.minor) },
      { label: 'Signal at 1 m', value: (row) => String(row.rssi_calibrated) },
      { label: 'Location', value: (row) => row.location?.name ?? 'Not assigned' },
      { label: 'ID', value: (row) => String(row.id) },
      ...audit,
    ],
  },
  {
    key: 'nfc-tags',
    label: 'NFC tags',
    singular: 'NFC tag',
    table: 'nfc_tags',
    idColumn: 'nfc_uid',
    permission: 'locations.manage',
    // Not `*`: the payload token column is not readable by clients.
    select: 'nfc_uid, location_id, created_at, updated_at, location(name)',
    orderBy: 'nfc_uid',
    searchColumns: ['nfc_uid'],
    searchText: (row) => `${row.nfc_uid} ${row.location?.name ?? ''}`,
    filter: { label: 'Status', value: (row) => (row.location_id ? 'Assigned' : 'Spare'), options: ['Assigned', 'Spare'] },
    columns: [{ label: 'Location', value: (row) => row.location?.name ?? 'Not assigned' }],
    title: (row) => row.nfc_uid,
    fields: [
      {
        name: 'nfc_uid',
        label: 'Tag UID',
        type: 'text',
        required: true,
        createOnly: true,
        uppercase: true,
        placeholder: '04A1B2C3',
        help: '8, 14 or 20 hex characters.',
        pattern: {
          regex: /^[0-9A-Fa-f]{8}([0-9A-Fa-f]{6}){0,2}$/,
          message: 'Use 8, 14 or 20 hex characters (0 to 9, A to F)',
        },
      },
      {
        name: 'location_id',
        label: 'Location',
        type: 'select',
        allowEmpty: 'Not assigned',
        optionsFrom: { table: 'location', value: 'id', label: 'name', order: 'name' },
        confirmChange: (from, to) => `Move this tag from ${from} to ${to}?`,
      },
    ],
    detailsFromReadOnly: true,
    readOnly: [{ label: 'Location', value: (row) => row.location?.name ?? 'Not assigned' }, ...audit],
  },
  {
    key: 'frequencies',
    label: 'Frequencies',
    singular: 'frequency',
    table: 'frequency',
    permission: 'classes.manage',
    select: '*',
    orderBy: 'interval_days',
    searchColumns: ['name'],
    columns: [{ label: 'Every', value: (row) => `${row.interval_days} days` }],
    title: (row) => row.name,
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Weekly' },
      { name: 'interval_days', label: 'Days between sessions', type: 'number', required: true, placeholder: '7' },
    ],
    readOnly: [{ label: 'ID', value: (row) => String(row.id) }],
  },
  {
    key: 'email-formats',
    label: 'Email formats',
    singular: 'email format',
    table: 'email_parm',
    permission: 'email_formats.manage',
    select: '*',
    orderBy: 'institution',
    searchColumns: ['institution', 'format'],
    columns: [{ label: 'Format', value: (row) => row.format }],
    title: (row) => row.format,
    fields: [
      { name: 'institution', label: 'Institution', type: 'text', required: true },
      {
        name: 'format',
        label: 'Email format',
        type: 'text',
        required: true,
        placeholder: '@institution.edu',
        help: 'The part after the person name, starting with @.',
      },
    ],
    readOnly: [{ label: 'ID', value: (row) => String(row.id) }, ...audit],
  },
  {
    key: 'permissions',
    label: 'Permissions',
    singular: 'permission',
    table: 'permissions',
    permission: 'roles.manage',
    select: '*',
    orderBy: 'name',
    searchColumns: ['name', 'description'],
    columns: [{ label: 'Description', value: (row) => row.description ?? '' }],
    title: (row) => row.name,
    fields: [
      { name: 'name', label: 'Key', type: 'text', required: true, placeholder: 'area.action' },
      { name: 'description', label: 'Description', type: 'text' },
    ],
    readOnly: [{ label: 'ID', value: (row) => String(row.id) }, ...audit],
  },
  {
    key: 'roles',
    label: 'Roles',
    singular: 'role',
    table: 'role',
    permission: 'roles.manage',
    select: '*, role_permission(count), users(count)',
    orderBy: 'name',
    searchColumns: ['name', 'description'],
    columns: [
      { label: 'Permissions', value: (row) => countOf(row, 'role_permission') },
      { label: 'Users', value: (row) => countOf(row, 'users') },
    ],
    title: (row) => row.name,
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'text' },
      { name: 'permission_ids', label: 'Permissions', type: 'permissions' },
    ],
    readOnly: [
      { label: 'ID', value: (row) => String(row.id) },
      { label: 'Users with this role', value: (row) => countOf(row, 'users') },
      ...audit,
    ],
  },
  {
    key: 'users',
    label: 'Users',
    singular: 'user',
    table: 'users',
    permission: 'users.manage',
    select: '*, role(name), email_parm(format)',
    orderBy: 'id',
    searchColumns: ['id', 'first_name', 'last_name', 'email'],
    canDelete: false,
    filter: { label: 'Role', value: (row) => row.role?.name ?? '' },
    columns: [
      { label: 'Name', value: (row) => `${row.first_name} ${row.last_name}` },
      { label: 'Role', value: (row) => row.role?.name ?? '' },
    ],
    title: (row) => `${row.first_name} ${row.last_name}`,
    fields: [
      {
        name: 'id',
        label: 'ID',
        type: 'text',
        required: true,
        createOnly: true,
        placeholder: 'S1000001',
        help: 'S, L or A followed by 1 to 7 digits.',
      },
      { name: 'first_name', label: 'First name', type: 'text', required: true },
      { name: 'last_name', label: 'Last name', type: 'text', required: true },
      {
        name: 'email_parm_id',
        label: 'Email format',
        type: 'select',
        required: true,
        createOnly: true,
        optionsFrom: { table: 'email_parm', value: 'id', label: 'format', order: 'format' },
      },
      { name: 'email', label: 'Email', type: 'text', required: true, createOnly: true, placeholder: 'name@institution.edu' },
      {
        name: 'role_id',
        label: 'Role',
        type: 'select',
        required: true,
        optionsFrom: { table: 'role', value: 'id', label: 'name', order: 'name' },
      },
      { name: 'overrides', label: 'Permission overrides', type: 'overrides' },
    ],
    readOnly: [
      { label: 'Email', value: (row) => row.email },
      { label: 'Role', value: (row) => row.role?.name ?? '' },
      { label: 'Email format', value: (row) => row.email_parm?.format ?? '' },
      ...audit,
    ],
  },
];

export function findEntity(key: string | undefined): EntityDef | undefined {
  return entities.find((entity) => entity.key === key);
}
