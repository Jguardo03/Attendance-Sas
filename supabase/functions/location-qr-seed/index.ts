// Turns QR check-in on or off for a location, or replaces its secret. The secret is random bytes made
// here and is never returned: clients only learn whether QR is on (location.qr_enabled).
//
// Only callers whose access token carries `locations.manage` may call it. The auth block is the same
// as in admin-create-user; each function deploys on its own, so it is repeated rather than shared.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function secretKey(): string {
  const dict = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (dict) {
    const keys = JSON.parse(dict) as Record<string, string>;
    return keys.default ?? Object.values(keys)[0];
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

function randomHex(bytes: number): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(data, (b) => b.toString(16).padStart(2, '0')).join('');
}

type Body = { location_id?: number; action?: 'enable' | 'regenerate' | 'disable' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!token) return json({ error: 'Not signed in' }, 401);
  const { data: auth, error: authError } = await admin.auth.getClaims(token);
  if (authError || !auth) return json({ error: 'Not signed in' }, 401);
  const permissions = (auth.claims as { permissions?: string[] }).permissions ?? [];
  if (!permissions.includes('locations.manage')) return json({ error: 'Not allowed' }, 403);

  const { location_id, action } = (await req.json().catch(() => ({}))) as Body;
  if (!location_id || !action || !['enable', 'regenerate', 'disable'].includes(action)) {
    return json({ error: 'location_id and action (enable, regenerate or disable) are required' }, 400);
  }

  const { data: location } = await admin
    .from('location')
    .select('id, qr_secret_seed')
    .eq('id', location_id)
    .maybeSingle();
  if (!location) return json({ error: 'Location not found' }, 404);

  // 32 random bytes; Postgres bytea accepts the \x hex form. The seed must be 16 to 64 bytes.
  let seed: string | null = location.qr_secret_seed;
  if (action === 'disable') seed = null;
  else if (action === 'regenerate' || !seed) seed = `\\x${randomHex(32)}`;

  const { error } = await admin.from('location').update({ qr_secret_seed: seed }).eq('id', location_id);
  if (error) return json({ error: 'Could not update QR', code: error.code, message: error.message }, 400);

  return json({ location_id, qr_enabled: seed !== null });
});
