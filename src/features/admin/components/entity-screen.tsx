import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';

import { Screen, ScreenHeader } from '@/components/ui';
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
  /** Null for a screen with nowhere to go back to (the list, when the menu is beside it). */
  backTo: (entity: EntityDef) => { label: string; href: Href } | null;
  children: (entity: EntityDef, id: string | undefined) => ReactNode;
}) {
  const { entity: key, id } = useLocalSearchParams<{ entity: string; id?: string }>();
  const { can } = useAuth();
  const router = useRouter();
  const entity = findEntity(key);

  if (!entity || !can(entity.permission)) return <Redirect href="/admin" />;
  const back = backTo(entity);

  return (
    <Screen title={title(entity)} header={<ScreenHeader title={title(entity)} subtitle={back?.label} onBack={back ? () => router.navigate(back.href) : undefined} />}>
      {children(entity, id)}
    </Screen>
  );
}
