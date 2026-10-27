import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type SignInResult = 'sent' | 'not-institutional' | 'rate-limited' | 'unavailable';

// Where the email link sends the person back to. Both values must be in the Supabase
// Authentication > URL Configuration > Redirect URLs list.
export function signInRedirectUrl(): string {
  if (Platform.OS === 'web') return `${window.location.origin}/auth-callback`;
  return Linking.createURL('auth-callback');
}

// An allowed domain always gets "sent", whether or not the account exists, so the screen
// cannot be used to find out who has an account.
export async function requestSignInLink(rawEmail: string): Promise<SignInResult> {
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
