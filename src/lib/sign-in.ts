import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type SignInResult = 'sent' | 'not-institutional' | 'rate-limited' | 'unavailable';
export type VerifyResult = 'ok' | 'invalid' | 'rate-limited' | 'unavailable';

// Supabase sends a code of 6 to 10 digits (the length is a dashboard setting).
export const codePattern = /^\d{6,10}$/;

// Only used if the email template still contains a link next to the code. Both values must be in the Supabase
// Authentication > URL Configuration > Redirect URLs list.
export function signInRedirectUrl(): string {
  if (Platform.OS === 'web') return `${window.location.origin}/auth-callback`;
  return Linking.createURL('auth-callback');
}

// An allowed domain always gets "sent", whether or not the account exists, so the screen
// cannot be used to find out who has an account.
export async function requestSignInCode(rawEmail: string): Promise<SignInResult> {
  if (!supabase) return 'unavailable';
  const email = rawEmail.trim().toLowerCase();

  const allowed = await supabase.rpc('is_allowed_email', { p_email: email });
  if (allowed.error) return 'unavailable';
  if (!allowed.data) return 'not-institutional';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: signInRedirectUrl() },
  });
  if (!error) return 'sent';
  if (error.status === 429) return 'rate-limited';
  // 422: no auth account for this email. Looks identical to success on purpose.
  if (error.status === 422) return 'sent';
  return 'unavailable';
}

// A wrong, expired or already used code all give the same answer. On success the session is stored and
// onAuthStateChange moves the app to the signed-in screens.
export async function verifySignInCode(rawEmail: string, rawCode: string): Promise<VerifyResult> {
  if (!supabase) return 'unavailable';
  const email = rawEmail.trim().toLowerCase();
  const token = rawCode.trim();
  if (!codePattern.test(token)) return 'invalid';

  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (!error) return 'ok';
  if (error.status === 429) return 'rate-limited';
  if (error.status && error.status >= 400 && error.status < 500) return 'invalid';
  return 'unavailable';
}
