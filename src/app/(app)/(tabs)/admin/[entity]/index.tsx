import { EntityList } from '@/features/admin/components/entity-list';
import { EntityScreen } from '@/features/admin/components/entity-screen';
import { adminHref } from '@/features/admin/routes';

export default function EntityListRoute() {
  return (
    <EntityScreen title={(entity) => entity.label} backTo={() => ({ label: 'Back to Admin', href: adminHref() })}>
      {(entity) => <EntityList entity={entity} />}
    </EntityScreen>
  );
}
