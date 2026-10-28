import type { EntityDef, FieldDef, Row } from './entities';

export type FormValues = Record<string, any>;

// Fields that are saved by their own code (role_permission, user_permission), not as a column.
const isRelation = (field: FieldDef) => field.type === 'permissions' || field.type === 'overrides';

export function initialValues(entity: EntityDef, row?: Row): FormValues {
  const values: FormValues = {};
  for (const field of entity.fields) {
    if (field.type === 'permissions') values[field.name] = [];
    else if (field.type === 'overrides') values[field.name] = {};
    else values[field.name] = row ? String(row[field.name] ?? '') : (field.defaultValue ?? '');
  }
  return values;
}

export function validateValues(
  entity: EntityDef,
  values: FormValues,
  creating: boolean,
  lookups: { emailFormat?: string } = {},
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of entity.fields) {
    if (isRelation(field) || (field.createOnly && !creating)) continue;
    const value = String(values[field.name] ?? '').trim();
    if (field.required && !value) {
      errors[field.name] = 'Required';
    } else if (value && field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors[field.name] = 'Use the format YYYY-MM-DD';
    } else if (value && field.type === 'number' && !/^\d+$/.test(value)) {
      errors[field.name] = 'Enter a whole number';
    }
  }
  if (entity.key === 'users' && creating) {
    const id = String(values.id ?? '').trim();
    if (id && !/^[SLA]\d{1,7}$/.test(id)) errors.id = 'Use S, L or A followed by 1 to 7 digits';
    const email = String(values.email ?? '').trim().toLowerCase();
    if (email && lookups.emailFormat && !email.endsWith(lookups.emailFormat.toLowerCase())) {
      errors.email = `Email must end with ${lookups.emailFormat}`;
    }
  }
  return errors;
}

// Column values for the main table. Empty optional fields become null; numbers become numbers.
export function buildPayload(entity: EntityDef, values: FormValues, creating: boolean): Row {
  const payload: Row = {};
  for (const field of entity.fields) {
    if (isRelation(field) || (field.createOnly && !creating)) continue;
    const value = String(values[field.name] ?? '').trim();
    if (!value) payload[field.name] = null;
    else if (field.type === 'number' || (field.type === 'select' && field.optionsFrom)) payload[field.name] = Number(value);
    else payload[field.name] = value;
  }
  return payload;
}
