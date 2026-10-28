import { parseIso } from '@/lib/dates';

import type { EntityDef, FieldDef, Row } from './entities';

export type FormValues = Record<string, any>;

// Fields that are saved by their own code (role_permission, user_permission), not as a column.
const isRelation = (field: FieldDef) => field.type === 'permissions' || field.type === 'overrides';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export function initialValues(entity: EntityDef, row?: Row): FormValues {
  const values: FormValues = {};
  for (const field of entity.fields) {
    if (field.type === 'permissions') values[field.name] = [];
    else if (field.type === 'overrides') values[field.name] = {};
    // The database returns times as HH:MM:SS; the form works in HH:MM.
    else if (row && field.type === 'time') values[field.name] = String(row[field.name] ?? '').slice(0, 5);
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
    } else if (value && field.type === 'date' && !parseIso(value)) {
      errors[field.name] = 'Use the format YYYY-MM-DD';
    } else if (value && field.type === 'time' && !timeRegex.test(value)) {
      errors[field.name] = 'Use the 24 hour format HH:MM';
    } else if (value && field.type === 'number' && !(field.signed ? /^-?\d+$/.test(value) : /^\d+$/.test(value))) {
      errors[field.name] = 'Enter a whole number';
    } else if (value && field.pattern && !field.pattern.regex.test(value)) {
      errors[field.name] = field.pattern.message;
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
  if (entity.key === 'periods' && !errors.start_date && !errors.finish_date && values.start_date && values.finish_date) {
    if (String(values.finish_date) <= String(values.start_date)) errors.finish_date = 'The finish date must be after the start date';
  }
  if (entity.key === 'schedules' && !errors.start_time && !errors.end_time && values.start_time && values.end_time) {
    if (values.end_time <= values.start_time) errors.end_time = 'The end time must be after the start time';
  }
  if (entity.key === 'beacons') {
    for (const name of ['major', 'minor']) {
      const value = String(values[name] ?? '').trim();
      if (!errors[name] && value && Number(value) > 65535) errors[name] = 'Use a value from 0 to 65535';
    }
    const rssi = String(values.rssi_calibrated ?? '').trim();
    if (!errors.rssi_calibrated && rssi && (Number(rssi) < -127 || Number(rssi) > 0)) {
      errors.rssi_calibrated = 'Use a value from -127 to 0';
    }
  }
  return errors;
}

// Column values for the main table. Empty optional fields become null; numbers become numbers.
export function buildPayload(entity: EntityDef, values: FormValues, creating: boolean): Row {
  const payload: Row = {};
  for (const field of entity.fields) {
    if (isRelation(field) || (field.createOnly && !creating)) continue;
    const raw = String(values[field.name] ?? '').trim();
    const value = field.uppercase ? raw.toUpperCase() : raw;
    const numeric =
      field.type === 'number' ||
      field.asNumber ||
      field.type === 'location-picker' ||
      (field.type === 'select' && field.optionsFrom && field.optionsFrom.value === 'id' && field.optionsFrom.table !== 'users');
    if (!value) payload[field.name] = null;
    else if (numeric) payload[field.name] = Number(value);
    else payload[field.name] = value;
  }
  return payload;
}
