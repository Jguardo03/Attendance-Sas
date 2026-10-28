import type { SupabaseClient } from '@supabase/supabase-js';

import type { DbErrorLike } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

import type { EntityDef, FieldDef, Row } from './entities';
import { buildPayload, type FormValues } from './form';
import { diffPermissions } from './permission-groups';

// Entities are described by data, so these calls cannot use the generated per-table types.
function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase as unknown as SupabaseClient;
}

/** The same untyped client, for the extras panels that read and write related rows. */
export const db = client;

export type PermissionOption = { id: number; name: string; description: string | null };

const idColumn = (entity: Pick<EntityDef, 'idColumn'>) => entity.idColumn ?? 'id';

export async function listRows(entity: EntityDef): Promise<Row[]> {
  const { data, error } = await client().from(entity.table).select(entity.select).order(entity.orderBy);
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

export async function getRow(entity: EntityDef, id: string): Promise<Row> {
  const { data, error } = await client().from(entity.table).select(entity.select).eq(idColumn(entity), id).single();
  if (error) throw error;
  return data as unknown as Row;
}

export async function listPermissions(): Promise<PermissionOption[]> {
  const { data, error } = await client().from('permissions').select('id, name, description').order('name');
  if (error) throw error;
  return data as PermissionOption[];
}

export async function listOptions(from: NonNullable<FieldDef['optionsFrom']>) {
  let query = client().from(from.table).select(from.select ?? `${from.value}, ${from.label}`);
  if (from.like) query = query.like(from.like.column, from.like.pattern);
  const { data, error } = await query.order(from.order);
  if (error) throw error;
  return (data as unknown as Row[]).map((row) => ({
    value: String(row[from.value]),
    label: from.format ? from.format(row) : String(row[from.label]),
  }));
}

export type Availability = { location_id: number; location_name: string; booked_schedule_id: number | null; booked_class: string | null };

/** Free or booked for every location, for one slot. Mirrors the overlap rule in the database. */
export async function listAvailability(slot: {
  periodId: number;
  weekDay: number;
  start: string;
  end: string;
  excludeScheduleId?: number;
}): Promise<Availability[]> {
  const { data, error } = await client().rpc('locations_availability', {
    p_period_id: slot.periodId,
    p_week_day: slot.weekDay,
    p_start: slot.start,
    p_end: slot.end,
    p_exclude_schedule_id: slot.excludeScheduleId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as Availability[];
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** The existing schedule that a booking clash ran into, so the error can name it and link to it. */
export async function findBooking(
  values: FormValues,
  constraint: string | undefined,
  excludeId?: string,
): Promise<{ id: string; label: string } | null> {
  let query = client()
    .from('class_schedule')
    .select('id, week_day, start_time, end_time, class(name), location(name)')
    .eq('academic_period_id', Number(values.academic_period_id))
    .eq('week_day', Number(values.week_day));
  query = constraint === 'uq_schedule_lecturer_slot' ? query.eq('lecturer_id', values.lecturer_id) : query.eq('location_id', Number(values.location_id));
  const { data } = await query;
  const start = toMinutes(String(values.start_time));
  const end = toMinutes(String(values.end_time));
  const clash = (data as unknown as Row[] | null)?.find(
    (row) => String(row.id) !== excludeId && toMinutes(row.start_time) < end && toMinutes(row.end_time) > start,
  );
  if (!clash) return null;
  const days = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    id: String(clash.id),
    label: `${clash.class?.name} (${days[clash.week_day]} ${String(clash.start_time).slice(0, 5)} to ${String(clash.end_time).slice(0, 5)}, ${clash.location?.name})`,
  };
}

/** Calls an Edge Function. A failure is rethrown in the shape of a database error. */
export async function callFunction<T = Row>(name: string, body: Row): Promise<T> {
  const { data, error } = await client().functions.invoke(name, { body });
  if (!error) return data as T;
  const response = (error as { context?: Response }).context;
  const reply = await response?.json?.().catch(() => undefined);
  const failure: DbErrorLike = { code: reply?.code, message: reply?.message ?? reply?.error, details: null };
  throw failure;
}

// Saved relations that belong to the form (role permissions, user overrides).
export async function loadRelations(entity: EntityDef, id: string): Promise<Partial<FormValues>> {
  if (entity.key === 'roles') {
    const { data, error } = await client().from('role_permission').select('permission_id').eq('role_id', id);
    if (error) throw error;
    return { permission_ids: (data ?? []).map((row) => row.permission_id as number) };
  }
  if (entity.key === 'users') {
    const { data, error } = await client().from('user_permission').select('permission_id, modifier_type').eq('user_id', id);
    if (error) throw error;
    return { overrides: Object.fromEntries((data ?? []).map((row) => [String(row.permission_id), row.modifier_type])) };
  }
  return {};
}

async function syncRolePermissions(roleId: number | string, chosen: number[]) {
  const saved = await loadRelations({ key: 'roles' } as EntityDef, String(roleId));
  const { toAdd, toRemove } = diffPermissions((saved.permission_ids as number[]) ?? [], chosen);
  if (toRemove.length) {
    const { error } = await client().from('role_permission').delete().eq('role_id', roleId).in('permission_id', toRemove);
    if (error) throw error;
  }
  if (toAdd.length) {
    const { error } = await client()
      .from('role_permission')
      .insert(toAdd.map((permission_id) => ({ role_id: roleId, permission_id })));
    if (error) throw error;
  }
}

async function syncOverrides(userId: string, overrides: Record<string, 'grant' | 'deny'>) {
  const saved = await loadRelations({ key: 'users' } as EntityDef, userId);
  const savedIds = Object.keys((saved.overrides as Record<string, string>) ?? {});
  const removed = savedIds.filter((id) => !overrides[id]).map(Number);
  if (removed.length) {
    const { error } = await client().from('user_permission').delete().eq('user_id', userId).in('permission_id', removed);
    if (error) throw error;
  }
  const rows = Object.entries(overrides).map(([permission_id, modifier_type]) => ({
    user_id: userId,
    permission_id: Number(permission_id),
    modifier_type,
  }));
  if (rows.length) {
    const { error } = await client().from('user_permission').upsert(rows, { onConflict: 'user_id,permission_id' });
    if (error) throw error;
  }
}

/** Creates or updates one row and the relations that belong to its form. Returns the row id. */
export async function saveEntity(entity: EntityDef, values: FormValues, id?: string): Promise<string> {
  const creating = id === undefined;
  const payload = buildPayload(entity, values, creating);

  if (entity.key === 'users') {
    let userId = id;
    if (creating) {
      userId = String(values.id).trim();
      await callFunction('admin-create-user', { ...payload, id: userId, email: String(values.email).trim().toLowerCase() });
    } else {
      const { error } = await client().from('users').update(payload).eq('id', id);
      if (error) throw error;
    }
    await syncOverrides(userId!, values.overrides ?? {});
    return userId!;
  }

  // NFC tags are registered by an Edge Function because the secret token is made on the server.
  if (entity.key === 'nfc-tags' && creating) {
    const uid = String(values.nfc_uid).trim().toUpperCase();
    await callFunction('nfc-tag', { action: 'create', nfc_uid: uid, location_id: payload.location_id ?? null });
    return uid;
  }

  let savedId = id;
  if (creating) {
    const { data, error } = await client().from(entity.table).insert(payload).select('id').single();
    if (error) throw error;
    savedId = String(data.id);
  } else {
    const { error } = await client().from(entity.table).update(payload).eq(idColumn(entity), id);
    if (error) throw error;
  }
  if (entity.key === 'roles') await syncRolePermissions(savedId!, values.permission_ids ?? []);
  return savedId!;
}

export async function deleteEntity(entity: EntityDef, id: string): Promise<void> {
  const { error } = await client().from(entity.table).delete().eq(idColumn(entity), id);
  if (error) throw error;
}

/** The existing row that a unique violation collided with, so "Open existing" can open it. */
export async function findExisting(entity: EntityDef, fields: string[], values: FormValues): Promise<string | null> {
  const used = fields.filter((field) => values[field] !== undefined && String(values[field]).trim() !== '');
  if (used.length === 0) return null;
  let query = client().from(entity.table).select(idColumn(entity));
  for (const field of used) {
    const def = entity.fields.find((candidate) => candidate.name === field);
    const raw = String(values[field]).trim();
    query = query.eq(field, def?.uppercase ? raw.toUpperCase() : raw);
  }
  const { data } = await query.maybeSingle();
  return data ? String((data as unknown as Row)[idColumn(entity)]) : null;
}
