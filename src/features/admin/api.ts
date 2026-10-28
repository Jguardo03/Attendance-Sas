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

export type PermissionOption = { id: number; name: string; description: string | null };

export async function listRows(entity: EntityDef): Promise<Row[]> {
  const { data, error } = await client().from(entity.table).select(entity.select).order(entity.orderBy);
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

export async function getRow(entity: EntityDef, id: string): Promise<Row> {
  const { data, error } = await client().from(entity.table).select(entity.select).eq('id', id).single();
  if (error) throw error;
  return data as unknown as Row;
}

export async function listPermissions(): Promise<PermissionOption[]> {
  const { data, error } = await client().from('permissions').select('id, name, description').order('name');
  if (error) throw error;
  return data as PermissionOption[];
}

export async function listOptions(from: NonNullable<FieldDef['optionsFrom']>) {
  const { data, error } = await client().from(from.table).select(`${from.value}, ${from.label}`).order(from.order);
  if (error) throw error;
  return (data as unknown as Row[]).map((row) => ({ value: String(row[from.value]), label: String(row[from.label]) }));
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

// The Edge Function answers with { error, code, message }. Rebuild a database-style error from it.
async function createUserWithFunction(payload: Row): Promise<void> {
  const { error } = await client().functions.invoke('admin-create-user', { body: payload });
  if (!error) return;
  const response = (error as { context?: Response }).context;
  const body = await response?.json?.().catch(() => undefined);
  const failure: DbErrorLike = { code: body?.code, message: body?.message ?? body?.error, details: null };
  throw failure;
}

/** Creates or updates one row and the relations that belong to its form. Returns the row id. */
export async function saveEntity(entity: EntityDef, values: FormValues, id?: string): Promise<string> {
  const creating = id === undefined;
  const payload = buildPayload(entity, values, creating);

  if (entity.key === 'users') {
    let userId = id;
    if (creating) {
      userId = String(values.id).trim();
      await createUserWithFunction({ ...payload, id: userId, email: String(values.email).trim().toLowerCase() });
    } else {
      const { error } = await client().from('users').update(payload).eq('id', id);
      if (error) throw error;
    }
    await syncOverrides(userId!, values.overrides ?? {});
    return userId!;
  }

  let savedId = id;
  if (creating) {
    const { data, error } = await client().from(entity.table).insert(payload).select('id').single();
    if (error) throw error;
    savedId = String(data.id);
  } else {
    const { error } = await client().from(entity.table).update(payload).eq('id', id);
    if (error) throw error;
  }
  if (entity.key === 'roles') await syncRolePermissions(savedId!, values.permission_ids ?? []);
  return savedId!;
}

export async function deleteEntity(entity: EntityDef, id: string): Promise<void> {
  const { error } = await client().from(entity.table).delete().eq('id', id);
  if (error) throw error;
}

/** The existing row that a unique violation collided with, so "Open existing" can open it. */
export async function findExisting(entity: EntityDef, fields: string[], values: FormValues): Promise<string | null> {
  const field = fields[0];
  if (!field || !values[field]) return null;
  const { data } = await client().from(entity.table).select('id').eq(field, String(values[field]).trim()).maybeSingle();
  return data ? String(data.id) : null;
}
