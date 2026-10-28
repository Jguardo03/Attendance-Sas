import { EntityDetails } from '@/features/admin/components/entity-details';
import { EntityScreen } from '@/features/admin/components/entity-screen';
import { adminHref } from '@/features/admin/routes';

export default function EntityDetailsRoute() {
  return (
    <EntityScreen
      title={(entity) => `${entity.singular.charAt(0).toUpperCase()}${entity.singular.slice(1)} details`}
      backTo={(entity) => ({ label: `Back to ${entity.label}`, href: adminHref(entity.key) })}>
      {(entity, id) => (id ? <EntityDetails entity={entity} id={id} /> : null)}
    </EntityScreen>
  );
}
