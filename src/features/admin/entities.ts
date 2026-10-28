// One definition per Admin entity. The generic list, details and form screens read these, so adding
// an entity means adding an entry here, not a new screen.

export type Row = Record<string, any>;

export type FieldDef = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'permissions' | 'overrides';
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  /** Options loaded from a table (for example the role or email format of a user). */
  optionsFrom?: { table: string; value: string; label: string; order: string };
  /** Cannot change after creation (a user's ID and email are tied to their sign-in account). */
  createOnly?: boolean;
  defaultValue?: string;
};

export type EntityDef = {
  key: string;
  label: string;
  singular: string;
  table: string;
  /** Permission that opens the screens. RLS is the real enforcement. */
  permission: string;
  select: string;
  orderBy: string;
  searchColumns: string[];
  columns: { label: string; value: (row: Row) => string }[];
  title: (row: Row) => string;
  fields: FieldDef[];
  /** Filter chips over the loaded rows. Without `options`, the distinct values found are used. */
  filter?: { label: string; value: (row: Row) => string; options?: string[] };
  /** Not offered where the database does not allow it (users have no delete grant). */
  canDelete?: boolean;
  /** Read-only attributes shown on the details screen, in addition to the form fields. */
  readOnly?: { label: string; value: (row: Row) => string }[];
};

const dateTime = (value: unknown) => (value ? new Date(String(value)).toLocaleString() : '');
const audit: EntityDef['readOnly'] = [
  { label: 'Created', value: (row) => dateTime(row.created_at) },
  { label: 'Updated', value: (row) => dateTime(row.updated_at) },
];

const countOf = (row: Row, relation: string) => String(row[relation]?.[0]?.count ?? 0);

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
