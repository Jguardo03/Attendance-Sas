import { useRouter } from 'expo-router';

import { EntityForm } from '@/features/admin/components/entity-form';
import { EntityScreen } from '@/features/admin/components/entity-screen';
import { initialValues } from '@/features/admin/form';
import { adminHref } from '@/features/admin/routes';

export default function NewEntityRoute() {
  const router = useRouter();

  return (
    <EntityScreen
      title={(entity) => `Add ${entity.singular}`}
      backTo={(entity) => ({ label: `Back to ${entity.label}`, href: adminHref(entity.key) })}>
      {(entity) => (
        <EntityForm
          entity={entity}
          initial={initialValues(entity)}
          onCancel={() => router.back()}
          onSaved={(id) => router.replace(adminHref(entity.key, id))}
        />
      )}
    </EntityScreen>
  );
}
