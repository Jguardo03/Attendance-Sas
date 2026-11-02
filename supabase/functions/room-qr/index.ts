// Returns the QR code to show in a room right now. See docs/check-in-protocol.md.
//
// Admins (locations.manage) may ask for any location with QR on. A lecturer (sessions.manage_own) may ask only for
// a session they teach, from 10 minutes before it starts until it ends, and gets that session's room. The secret is
// read here, with the secret key, and only the short-lived code goes back. The sign-in and CORS blocks are repeated
// in each function because each one deploys alone.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function secretKey(): string {
  const dict = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (dict) {
    const keys = JSON.parse(dict) as Record<string, string>;
    return keys.default ?? Object.values(keys)[0];
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

const STEP_SECONDS = 30;

function seedBytes(value: string): Uint8Array {
  const hex = value.replace(/^\\x/, '');
  return Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));
}

async function macFor(seed: Uint8Array, locationId: number, step: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', seed, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${locationId}.${step}`));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

type Body = { location_id?: number; session_id?: number };

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
  const claims = auth.claims as { permissions?: string[]; app_user_id?: string };
  const permissions = claims.permissions ?? [];
  const isAdmin = permissions.includes('locations.manage');
  const isLecturer = permissions.includes('sessions.manage_own');
  if (!isAdmin && !isLecturer) return json({ error: 'Not allowed', code: 'not_allowed' }, 403);

  const body = (await req.json().catch(() => ({}))) as Body;
  let locationId: number | null = null;

  if (Number.isInteger(body.session_id)) {
    const { data: session, error: sessionError } = await admin
      .from('session_overview')
      .select('location_id, lecturer_id, status, check_in_opens_at, ends_at, now_local')
      .eq('session_id', body.session_id)
      .maybeSingle();
    // A failed lookup is a server problem, not "no such session".
    if (sessionError) return json({ error: 'Could not look up the session', code: 'server_error' }, 500);
    if (!session) return json({ error: 'Session not found', code: 'session_not_found' }, 404);
    if (!isAdmin) {
      // A lecturer: their own session, only while check in is open.
      const open = session.now_local >= session.check_in_opens_at && session.now_local < session.ends_at;
      if (session.lecturer_id !== claims.app_user_id || session.status === 'cancelled' || !open) {
        return json({ error: 'Not allowed', code: 'not_allowed' }, 403);
      }
    }
    locationId = session.location_id;
  } else if (Number.isInteger(body.location_id) && isAdmin) {
    locationId = body.location_id!;
  } else {
    return json({ error: 'session_id (or location_id for an admin) is required', code: 'bad_request' }, 400);
  }

  const { data: location, error: locationError } = await admin.from('location').select('id, name, qr_secret_seed').eq('id', locationId).maybeSingle();
  if (locationError) return json({ error: 'Could not look up the room', code: 'server_error' }, 500);
  if (!location) return json({ error: 'Location not found', code: 'not_found' }, 404);
  if (!location.qr_secret_seed) return json({ error: 'QR check in is off for this room', code: 'qr_disabled' }, 409);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const step = Math.floor(nowSeconds / STEP_SECONDS);
  const mac = await macFor(seedBytes(location.qr_secret_seed), location.id, step);

  return json({
    location_id: location.id,
    location_name: location.name,
    payload: `v1.${location.id}.${step}.${mac}`,
    step,
    expires_in: STEP_SECONDS - (nowSeconds % STEP_SECONDS),
  });
});
