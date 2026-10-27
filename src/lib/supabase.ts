import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

// Null until .env is filled in, so the app still renders (and builds) without a backend.
export const supabase = isSupabaseConfigured
  ? createClient<Database>(url as string, publishableKey as string, {
      auth: {
        // Web uses the browser default (localStorage); native persists the session in AsyncStorage.
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Web consumes the magic-link tokens in the URL itself. Native handles the deep link in
        // src/app/auth-callback.tsx, since there is no browser URL to read.
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
