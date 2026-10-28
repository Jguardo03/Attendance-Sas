import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';

import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/providers/auth';

import { findEntity, type EntityDef } from '../entities';

// Shared frame for the entity routes: finds the entity from the URL and requires its permission.
// This only hides screens; the database rules are what actually block a change.
export function EntityScreen({
  title,
  backTo,
  children,
}: {
  title: (entity: EntityDef) => string;
  backTo: (entity: EntityDef) => { label: string; href: Href };
  children: (entity: EntityDef, id: string | undefined) => ReactNode;
}) {
  const { entity: key, id } = useLocalSearchParams<{ entity: string; id?: string }>();
  const { can } = useAuth();
  const router = useRouter();
  const entity = findEntity(key);

  if (!entity || !can(entity.permission)) return <Redirect href="/admin" />;
  const back = backTo(entity);

  return (
    <Screen title={title(entity)}>
      <Button variant="secondary" label={back.label} onPress={() => router.navigate(back.href)} />
      {children(entity, id)}
    </Screen>
  );
}
