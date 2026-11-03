import { Banner } from '@/components/ui';
import type { FriendlyError } from '@/lib/db-errors';

// The one error component for every Admin save or delete the database rejects (Admin UI pages 25 to 29): a red banner
// with the title, what happened, what it conflicts with, and two actions. The caller scrolls the screen up to it.
export function CrudError({
  error,
  onAction,
  onDismiss,
}: {
  error: FriendlyError;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <Banner
      tone="error"
      title={error.title}
      message={error.conflict ? `${error.message}
Conflicts with: ${error.conflict}` : error.message}
      actions={[
        { label: error.actionLabel, onPress: onAction },
        { label: 'Dismiss', onPress: onDismiss },
      ]}
    />
  );
}
