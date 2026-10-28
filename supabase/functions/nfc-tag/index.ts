// Registers an NFC tag or replaces its secret token. The token (payload_token) is random, made here and
// never returned or readable by clients: the check-in functions compare against it on the server.
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

type Body = { action?: 'create' | 'regenerate'; nfc_uid?: string; location_id?: number | null };

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

  const body = (await req.json().catch(() => ({}))) as Body;
  const nfcUid = body.nfc_uid?.trim().toUpperCase();
  if (!nfcUid || !body.action || !['create', 'regenerate'].includes(body.action)) {
    return json({ error: 'nfc_uid and action (create or regenerate) are required' }, 400);
  }
  // 4, 7 or 10 bytes as hex, the same rule as chk_nfc_tags_nfc_uid
  if (!/^[0-9A-F]{8}([0-9A-F]{6}){0,2}$/.test(nfcUid)) {
    return json({ error: 'The tag UID must be 8, 14 or 20 hex characters' }, 400);
  }

  const payloadToken = randomHex(32);

  if (body.action === 'create') {
    const { error } = await admin
      .from('nfc_tags')
      .insert({ nfc_uid: nfcUid, location_id: body.location_id ?? null, payload_token: payloadToken });
    if (error) return json({ error: 'Could not save tag', code: error.code, message: error.message }, 400);
    return json({ nfc_uid: nfcUid }, 201);
  }

  const { data, error } = await admin
    .from('nfc_tags')
    .update({ payload_token: payloadToken })
    .eq('nfc_uid', nfcUid)
    .select('nfc_uid');
  if (error) return json({ error: 'Could not update tag', code: error.code, message: error.message }, 400);
  if (!data?.length) return json({ error: 'Tag not found' }, 404);
  return json({ nfc_uid: nfcUid });
});
