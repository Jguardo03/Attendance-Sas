import { EntityList } from '@/features/admin/components/entity-list';
import { EntityScreen } from '@/features/admin/components/entity-screen';
import { adminHref } from '@/features/admin/routes';
import { useIsWide } from '@/features/shell/nav';

export default function EntityListRoute() {
  const wide = useIsWide();
  return (
    <EntityScreen title={(entity) => entity.label} backTo={() => (wide ? null : { label: 'Back to Admin', href: adminHref() })}>
      {(entity) => <EntityList entity={entity} />}
    </EntityScreen>
  );
}
