import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Select, TextField } from '@/components/ui';
import { mapDbError, type FriendlyError } from '@/lib/db-errors';

import { findExisting, listOptions, listPermissions, saveEntity } from '../api';
import type { EntityDef, FieldDef } from '../entities';
import { validateValues, type FormValues } from '../form';
import { CrudError } from './crud-error';
import { OverridesEditor } from './overrides-editor';
import { PermissionChecklist } from './permission-checklist';
import { adminHref } from '../routes';

function OptionSelect({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const loaded = useQuery({
    queryKey: ['admin', 'options', field.optionsFrom?.table],
    enabled: Boolean(field.optionsFrom),
    queryFn: () => listOptions(field.optionsFrom!),
  });
  return (
    <Select
      label={field.label}
      value={value}
      options={field.options ?? loaded.data ?? []}
      onChange={onChange}
      error={error}
    />
  );
}

// Create and edit form for any entity. Keeps what was typed when a save fails.
export function EntityForm({
  entity,
  initial,
  id,
  onCancel,
  onSaved,
}: {
  entity: EntityDef;
  initial: FormValues;
  id?: string;
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const creating = id === undefined;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<FriendlyError | null>(null);

  const needsPermissions = entity.fields.some((field) => field.type === 'permissions' || field.type === 'overrides');
  const permissions = useQuery({
    queryKey: ['admin', 'permissions-list'],
    enabled: needsPermissions,
    queryFn: listPermissions,
  });
  const emailFormats = useQuery({
    queryKey: ['admin', 'options', 'email_parm'],
    enabled: entity.key === 'users',
    queryFn: () => listOptions({ table: 'email_parm', value: 'id', label: 'format', order: 'format' }),
  });

  function setValue(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
    // Editing a marked field clears its marker.
    setErrors((current) => {
      if (!current[name]) return current;
      const { [name]: _removed, ...rest } = current;
      return rest;
    });
  }

  const save = useMutation({
    mutationFn: () => saveEntity(entity, values, id),
    onSuccess: async (savedId) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', entity.key] });
      onSaved(savedId);
    },
    onError: (error) => {
      const friendly = mapDbError(error as { code?: string; message?: string }, { item: entity.singular, values });
      setFailure(friendly);
      setErrors((current) => ({
        ...current,
        ...Object.fromEntries(friendly.fields.map((field) => [field, friendly.message])),
      }));
    },
  });

  function submit() {
    const emailFormat = emailFormats.data?.find((option) => option.value === String(values.email_parm_id))?.label;
    const found = validateValues(entity, values, creating, { emailFormat });
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length === 0) save.mutate();
  }

  async function onFailureAction() {
    if (failure?.action === 'open-existing') {
      const existing = await findExisting(entity, failure.fields, values);
      if (existing) {
        router.push(adminHref(entity.key, existing));
        return;
      }
    }
    setFailure(null);
  }

  return (
    <View className="gap-4">
      {failure ? <CrudError error={failure} onAction={onFailureAction} onDismiss={() => setFailure(null)} /> : null}

      {entity.fields.map((field) => {
        if (field.createOnly && !creating) return null;
        if (field.type === 'permissions') {
          return (
            <PermissionChecklist
              key={field.name}
              permissions={permissions.data ?? []}
              selected={values[field.name] ?? []}
              onChange={(next) => setValue(field.name, next)}
            />
          );
        }
        if (field.type === 'overrides') {
          return (
            <OverridesEditor
              key={field.name}
              permissions={permissions.data ?? []}
              value={values[field.name] ?? {}}
              onChange={(next) => setValue(field.name, next)}
            />
          );
        }
        if (field.type === 'select') {
          return (
            <OptionSelect
              key={field.name}
              field={field}
              value={String(values[field.name] ?? '')}
              error={errors[field.name]}
              onChange={(value) => setValue(field.name, value)}
            />
          );
        }
        return (
          <TextField
            key={field.name}
            label={field.required ? `${field.label} *` : field.label}
            value={String(values[field.name] ?? '')}
            onChangeText={(value) => setValue(field.name, value)}
            placeholder={field.placeholder}
            multiline={field.type === 'textarea'}
            keyboardType={field.type === 'number' ? 'number-pad' : 'default'}
            autoCapitalize="none"
            autoCorrect={false}
            error={errors[field.name] ?? undefined}
          />
        );
      })}

      <Button label={save.isPending ? 'Saving...' : 'Save'} disabled={save.isPending} onPress={submit} />
      <Button variant="secondary" label="Cancel" onPress={onCancel} />
    </View>
  );
}
