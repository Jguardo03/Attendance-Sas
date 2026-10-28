// Creates a person: a Supabase Auth account plus the matching row in public.users.
// Needed because sign-in uses shouldCreateUser:false, so an auth account must exist first.
//
// Only callers whose access token carries the `users.manage` permission (added by the access
// token hook) may call it. The secret key stays inside Edge Functions and never reaches a client.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// New projects expose the secret key as a JSON dictionary; older ones as the service role key.
function secretKey(): string {
  const dict = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (dict) {
    const keys = JSON.parse(dict) as Record<string, string>;
    return keys.default ?? Object.values(keys)[0];
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

type Body = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role_id?: number;
  email_parm_id?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authorize in code: this function is deployed with verify_jwt off.
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '');
  if (!token) return json({ error: 'Not signed in' }, 401);
  const { data: auth, error: authError } = await admin.auth.getClaims(token);
  if (authError || !auth) return json({ error: 'Not signed in' }, 401);
  const permissions = (auth.claims as { permissions?: string[] }).permissions ?? [];
  if (!permissions.includes('users.manage')) return json({ error: 'Not allowed' }, 403);

  const body = (await req.json().catch(() => ({}))) as Body;
  const { id, first_name, last_name, role_id, email_parm_id } = body;
  const email = body.email?.trim().toLowerCase();
  if (!id || !first_name || !last_name || !email || !role_id || !email_parm_id) {
    return json({ error: 'id, first_name, last_name, email, role_id and email_parm_id are required' }, 400);
  }

  // The email must match the institution's allowed format, like the sign-in screen checks.
  const { data: parm } = await admin.from('email_parm').select('format').eq('id', email_parm_id).single();
  if (!parm || !email.endsWith(parm.format.toLowerCase())) {
    return json({ error: 'Email does not match the allowed format' }, 400);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createError || !created.user) {
    // Same shape as a database error so the app can show its standard "already exists" message.
    const exists = createError?.code === 'email_exists';
    return json(
      {
        error: 'Could not create account',
        code: exists ? '23505' : undefined,
        message: exists ? 'violates unique constraint "uq_users_email_lower"' : createError?.message,
      },
      400,
    );
  }

  const { error: insertError } = await admin.from('users').insert({
    id,
    first_name,
    last_name,
    email,
    role_id,
    email_parm_id,
    auth_user_id: created.user.id,
  });
  if (insertError) {
    // Do not leave an auth account without a users row.
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: 'Could not create user', code: insertError.code, message: insertError.message }, 400);
  }

  return json({ id, auth_user_id: created.user.id }, 201);
});
