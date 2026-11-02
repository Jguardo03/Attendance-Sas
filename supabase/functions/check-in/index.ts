// Records a student's check in. The rules are in docs/check-in-protocol.md.
//
// This function only decides whether the evidence (the QR code) is genuine and for the right room. Everything about
// the session's state (enrolled, open, late, already checked in) is decided by the database in record_check_in, with
// the database clock, so the app's clock is never trusted. The room secret is read here, with the secret key, and
// never leaves this function. The sign-in and CORS blocks are repeated in each function because each one deploys alone.
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

// bytea comes back from PostgREST as "\x" followed by hex.
function seedBytes(value: string): Uint8Array {
  const hex = value.replace(/^\\x/, '');
  return Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));
}

async function macFor(seed: Uint8Array, locationId: number, step: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', seed, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${locationId}.${step}`));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Compares without stopping at the first difference.
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type Body = { sessionId?: number; method?: string; evidence?: { payload?: string } };

const statusByCode: Record<string, number> = {
  session_not_found: 404,
  not_enrolled: 403,
  cancelled: 409,
  already_checked_in: 409,
  not_open: 409,
  closed: 409,
};

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
  if (!claims.app_user_id || !(claims.permissions ?? []).includes('attendance.check_in')) {
    return json({ error: 'Not allowed', code: 'not_allowed' }, 403);
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const payload = body.evidence?.payload;
  if (!Number.isInteger(body.sessionId) || !body.method || typeof payload !== 'string') {
    return json({ error: 'sessionId, method and evidence.payload are required', code: 'bad_request' }, 400);
  }
  if (body.method !== 'qr') return json({ error: 'That check in method is not available yet', code: 'unsupported_method' }, 400);

  // The room the session is in right now (a moved session uses its new room).
  const { data: session, error: sessionError } = await admin
    .from('session_overview')
    .select('location_id')
    .eq('session_id', body.sessionId)
    .maybeSingle();
  // A failed lookup is a server problem, not "no such session".
  if (sessionError) return json({ error: 'Could not look up the session', code: 'server_error' }, 500);
  if (!session) return json({ error: 'Session not found', code: 'session_not_found' }, 404);

  const match = /^v1\.(\d+)\.(\d+)\.([0-9a-f]{16})$/.exec(payload.trim());
  const invalid = () => json({ error: 'That QR code is not valid here. Scan the code shown in the room.', code: 'invalid_code' }, 422);
  if (!match) return invalid();
  const [locationId, step, mac] = [Number(match[1]), Number(match[2]), match[3]];
  if (locationId !== session.location_id) return invalid();

  const nowStep = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  if (Math.abs(step - nowStep) > 1) return invalid();

  const { data: location, error: locationError } = await admin.from('location').select('qr_secret_seed').eq('id', locationId).maybeSingle();
  if (locationError) return json({ error: 'Could not look up the room', code: 'server_error' }, 500);
  if (!location?.qr_secret_seed) return json({ error: 'QR check in is off for this room', code: 'qr_disabled' }, 409);
  const expected = await macFor(seedBytes(location.qr_secret_seed), locationId, step);
  if (!sameText(expected, mac)) return invalid();

  const { data: result, error } = await admin.rpc('record_check_in', {
    p_student_id: claims.app_user_id,
    p_session_id: body.sessionId,
    p_method: 'qr',
  });
  if (error || !result) return json({ error: 'Could not record the check in', code: 'server_error' }, 500);

  if (!result.ok) {
    return json({ error: 'Could not check in', ...result }, statusByCode[result.code] ?? 409);
  }
  return json(
    { status: result.status, checked_in_at: result.checked_in_at, method: result.method, session_id: result.session_id },
    201,
  );
});
