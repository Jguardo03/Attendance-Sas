import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Text, useScrollUpOn } from '@/components/ui';
import { mapDbError, type FriendlyError } from '@/lib/db-errors';

import { deleteEntity, getRow, listPermissions, loadRelations } from '../api';
import type { EntityDef } from '../entities';
import { initialValues } from '../form';
import { CrudError } from './crud-error';
import { EntityForm } from './entity-form';
import { LocationExtras, TagExtras } from './location-extras';
import { ScheduleExtras } from './schedule-extras';
import { adminHref } from '../routes';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <Text variant="meta">{label}</Text>
      <Text className="flex-1 text-right">{value}</Text>
    </View>
  );
}

// Everything about one row, with Edit and Delete (with confirm). Roles and users also list their
// permissions and overrides.
export function EntityDetails({ entity, id }: { entity: EntityDef; id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<FriendlyError | null>(null);
  // The error box is at the top of the details; bring it into view when one appears.
  useScrollUpOn(failure);

  const row = useQuery({ queryKey: ['admin', entity.key, id], queryFn: () => getRow(entity, id) });
  const relations = useQuery({ queryKey: ['admin', entity.key, id, 'relations'], queryFn: () => loadRelations(entity, id) });
  const permissions = useQuery({
    queryKey: ['admin', 'permissions-list'],
    enabled: entity.key === 'roles' || entity.key === 'users',
    queryFn: listPermissions,
  });

  const remove = useMutation({
    mutationFn: () => deleteEntity(entity, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', entity.key] });
      router.replace(adminHref(entity.key));
    },
    onError: (error) => {
      setConfirming(false);
      setFailure(mapDbError(error as { code?: string; message?: string }, { item: entity.singular }));
    },
  });

  if (row.isPending || relations.isPending) return <Text variant="muted">Loading...</Text>;
  if (row.isError || !row.data) return <Text variant="error">Could not load this {entity.singular}.</Text>;

  const data = row.data;
  const permissionName = (permissionId: number | string) =>
    permissions.data?.find((permission) => permission.id === Number(permissionId))?.name ?? String(permissionId);

  if (editing) {
    return (
      <EntityForm
        entity={entity}
        id={id}
        initial={{ ...initialValues(entity, data), ...relations.data }}
        onCancel={() => setEditing(false)}
        onSaved={async () => {
          await queryClient.invalidateQueries({ queryKey: ['admin', entity.key, id] });
          setEditing(false);
        }}
      />
    );
  }

  const shown = entity.detailsFromReadOnly
    ? []
    : entity.fields.filter((field) => !field.optionsFrom && field.type !== 'permissions' && field.type !== 'overrides');
  const rolePermissions = (relations.data?.permission_ids as number[] | undefined) ?? [];
  const overrides = Object.entries((relations.data?.overrides as Record<string, string> | undefined) ?? {});

  return (
    <View className="gap-4">
      {failure ? <CrudError error={failure} onAction={() => setFailure(null)} onDismiss={() => setFailure(null)} /> : null}

      <Card title={entity.title(data)}>
        {shown.map((field) => (
          <Row key={field.name} label={field.label} value={String(data[field.name] ?? '')} />
        ))}
        {entity.readOnly?.map((item) => (
          <Row key={item.label} label={item.label} value={item.value(data)} />
        ))}
      </Card>

      {entity.key === 'roles' ? (
        <Card title={`Permissions (${rolePermissions.length})`}>
          {rolePermissions.length === 0 ? <Text variant="meta">None.</Text> : null}
          {rolePermissions.map((permissionId) => (
            <Text key={permissionId}>{permissionName(permissionId)}</Text>
          ))}
        </Card>
      ) : null}

      {entity.key === 'users' ? (
        <Card title="Permission overrides">
          {overrides.length === 0 ? <Text variant="muted">None. This person has what their role gives.</Text> : null}
          {overrides.map(([permissionId, modifier]) => (
            <View key={permissionId} className="flex-row items-center justify-between gap-2">
              <Text className="flex-1">{permissionName(permissionId)}</Text>
              <Badge label={modifier} tone={modifier === 'deny' ? 'danger' : 'success'} />
            </View>
          ))}
        </Card>
      ) : null}

      {entity.key === 'locations' ? <LocationExtras id={id} qrEnabled={Boolean(data.qr_enabled)} /> : null}
      {entity.key === 'nfc-tags' ? <TagExtras uid={id} /> : null}
      {entity.key === 'schedules' ? <ScheduleExtras id={id} schedule={data} /> : null}

      <Button label={`Edit ${entity.singular}`} onPress={() => setEditing(true)} />

      {entity.canDelete === false ? null : confirming ? (
        <Card title={`Delete this ${entity.singular}?`}>
          <Text variant="muted">
            {entity.key === 'permissions'
              ? 'Deleting a permission also removes it from every role and from any user override.'
              : entity.key === 'locations'
                ? 'Beacons and NFC tags here become unassigned. This cannot be undone.'
                : 'This cannot be undone.'}
          </Text>
          <Button variant="danger" label={remove.isPending ? 'Deleting...' : 'Delete'} disabled={remove.isPending} onPress={() => remove.mutate()} />
          <Button variant="secondary" label="Cancel" onPress={() => setConfirming(false)} />
        </Card>
      ) : (
        <Button variant="secondary" label={`Delete ${entity.singular}`} onPress={() => setConfirming(true)} />
      )}
    </View>
  );
}
