import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, DateField, Select, Text, TextField, TimeField, useScrollUpOn } from '@/components/ui';
import { mapDbError, type FriendlyError } from '@/lib/db-errors';

import { findBooking, findExisting, listOptions, listPermissions, saveEntity } from '../api';
import type { EntityDef, FieldDef } from '../entities';
import { validateValues, type FormValues } from '../form';
import { adminHref } from '../routes';
import { CrudError } from './crud-error';
import { LocationPicker } from './location-picker';
import { OverridesEditor } from './overrides-editor';
import { PermissionChecklist } from './permission-checklist';

type Option = { value: string; label: string };

function optionsKey(field: FieldDef) {
  return ['admin', 'options', field.optionsFrom?.table, field.optionsFrom?.like?.pattern ?? ''];
}

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
    queryKey: optionsKey(field),
    enabled: Boolean(field.optionsFrom),
    queryFn: () => listOptions(field.optionsFrom!),
  });
  const options: Option[] = [
    ...(field.allowEmpty ? [{ value: '', label: field.allowEmpty }] : []),
    ...(field.options ?? loaded.data ?? []),
  ];
  return <Select label={field.required ? `${field.label} *` : field.label} value={value} options={options} onChange={onChange} error={error} />;
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
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  // The error box is at the top of the form; bring it into view whenever one appears.
  useScrollUpOn(failure);

  const needsPermissions = entity.fields.some((field) => field.type === 'permissions' || field.type === 'overrides');
  const permissions = useQuery({
    queryKey: ['admin', 'permissions-list'],
    enabled: needsPermissions,
    queryFn: listPermissions,
  });
  const emailFormats = useQuery({
    queryKey: ['admin', 'options', 'email_parm', ''],
    enabled: entity.key === 'users',
    queryFn: () => listOptions({ table: 'email_parm', value: 'id', label: 'format', order: 'format' }),
  });

  function setValue(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
    setConfirmMessage(null);
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
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      onSaved(savedId);
    },
    onError: async (error) => {
      const friendly = mapDbError(error as { code?: string; message?: string }, { item: entity.singular, values });
      const booking = friendly.action === 'view-booking';
      setErrors((current) => ({
        ...current,
        // A booking clash marks the room or lecturer and the time fields, as in the wireframe.
        ...Object.fromEntries(
          friendly.fields.map((field, index) => [field, booking ? (index === 0 ? 'Booked at this time' : 'Overlaps') : friendly.message]),
        ),
      }));
      setFailure(friendly);
      if (booking && entity.key === 'schedules') {
        const found = await findBooking(values, friendly.constraint, id);
        if (found) {
          setBookingId(found.id);
          setFailure({ ...friendly, conflict: found.label });
        }
      }
    },
  });

  // Label of the option currently chosen for a field, read from the options the form already loaded.
  function labelFor(field: FieldDef, value: string): string {
    if (!value) return field.allowEmpty ?? 'none';
    const options = queryClient.getQueryData<Option[]>(optionsKey(field)) ?? [];
    return options.find((option) => option.value === value)?.label ?? value;
  }

  function submit(confirmed = false) {
    const emailFormat = emailFormats.data?.find((option) => option.value === String(values.email_parm_id))?.label;
    const found = validateValues(entity, values, creating, { emailFormat });
    setErrors(found);
    setFailure(null);
    setBookingId(null);
    if (Object.keys(found).length > 0) {
      // Same error box as a database refusal, at the top, so the screen scrolls up to it.
      const labels = entity.fields.filter((field) => found[field.name]).map((field) => field.label);
      setFailure({
        title: 'Check the details',
        message: `Fix the marked fields: ${labels.join(', ')}.`,
        action: 'fix-field',
        actionLabel: 'Fix field',
        fields: Object.keys(found),
      });
      return;
    }

    if (!confirmed && !creating) {
      for (const field of entity.fields) {
        const from = String(initial[field.name] ?? '');
        const to = String(values[field.name] ?? '');
        if (field.confirmChange && from && from !== to) {
          setConfirmMessage(field.confirmChange(labelFor(field, from), labelFor(field, to)));
          return;
        }
      }
    }
    setConfirmMessage(null);
    save.mutate();
  }

  async function onFailureAction() {
    if (failure?.action === 'open-existing') {
      const existing = await findExisting(entity, failure.fields, values);
      if (existing) {
        router.push(adminHref(entity.key, existing));
        return;
      }
    }
    if (failure?.action === 'view-booking' && bookingId) {
      router.push(adminHref(entity.key, bookingId));
      return;
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
        if (field.type === 'location-picker') {
          return (
            <LocationPicker
              key={field.name}
              values={values}
              value={String(values[field.name] ?? '')}
              excludeScheduleId={id}
              error={errors[field.name]}
              onChange={(next) => setValue(field.name, next)}
            />
          );
        }
        if (field.type === 'date') {
          return (
            <DateField
              key={field.name}
              label={field.required ? `${field.label} *` : field.label}
              value={String(values[field.name] ?? '')}
              anchor={field.anchorField ? String(values[field.anchorField] ?? '') : undefined}
              error={errors[field.name]}
              onChange={(next) => setValue(field.name, next)}
            />
          );
        }
        if (field.type === 'time') {
          return (
            <TimeField
              key={field.name}
              label={field.required ? `${field.label} *` : field.label}
              value={String(values[field.name] ?? '')}
              error={errors[field.name]}
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
              onChange={(next) => setValue(field.name, next)}
            />
          );
        }
        return (
          <TextField
            key={field.name}
            label={field.required ? `${field.label} *` : field.label}
            value={String(values[field.name] ?? '')}
            onChangeText={(next) => setValue(field.name, next)}
            placeholder={field.placeholder}
            multiline={field.type === 'textarea'}
            keyboardType={field.type === 'number' && !field.signed ? 'number-pad' : 'default'}
            autoCapitalize={field.uppercase ? 'characters' : 'none'}
            autoCorrect={false}
            error={errors[field.name] ?? undefined}
          />
        );
      })}

      {confirmMessage ? (
        <Card title="Confirm the change">
          <Text>{confirmMessage}</Text>
          <Button label="Confirm and save" onPress={() => submit(true)} disabled={save.isPending} />
          <Button variant="secondary" label="Keep editing" onPress={() => setConfirmMessage(null)} />
        </Card>
      ) : (
        <Button label={save.isPending ? 'Saving...' : 'Save'} disabled={save.isPending} onPress={() => submit()} />
      )}
      <Button variant="secondary" label="Cancel" onPress={onCancel} />
    </View>
  );
}
