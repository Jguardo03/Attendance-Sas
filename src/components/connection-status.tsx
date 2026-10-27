import { useQuery } from '@tanstack/react-query';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import { Badge, Card, Text } from './ui';

// Walking-skeleton check: proves Expo -> TanStack Query -> Supabase works end to end.
// Reads the `role` table once the Phase 3 schema exists; before that, a "table not found"
// answer from the API still proves the backend is reachable.
export function ConnectionStatus() {
  const { data, isPending } = useQuery({
    queryKey: ['connection-status'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      // Not a HEAD request: PostgREST sends no error body for HEAD, so failures would look like success.
      const { count, error } = await supabase!.from('role').select('id', { count: 'exact' }).limit(1);
      if (!error) return { state: 'ok' as const, detail: `${count ?? 0} roles` };
      // 42501: the schema exists and signed-out visitors correctly get no access (expected until sign-in exists).
      if (error.code === '42501') {
        return { state: 'reachable' as const, detail: 'Database reachable. Data is private until you sign in.' };
      }
      // PGRST205: table missing from the API schema cache (schema not applied).
      if (error.code === 'PGRST205') {
        return { state: 'reachable' as const, detail: 'Database reachable, schema not applied yet (PGRST205)' };
      }
      return { state: 'error' as const, detail: error.message };
    },
  });

  if (!isSupabaseConfigured) {
    return (
      <Card title="Backend">
        <Badge tone="warning" label="Not configured" />
        <Text variant="muted">
          Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.
        </Text>
      </Card>
    );
  }

  return (
    <Card title="Backend">
      {isPending || !data ? (
        <Badge label="Checking..." />
      ) : (
        <>
          <Badge
            tone={data.state === 'error' ? 'danger' : 'success'}
            label={data.state === 'error' ? 'Error' : 'Connected'}
          />
          <Text variant={data.state === 'error' ? 'error' : 'muted'}>{data.detail}</Text>
        </>
      )}
    </Card>
  );
}
