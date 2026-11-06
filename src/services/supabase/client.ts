import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client.
 *
 * Only the PUBLIC project URL and anon key may be used here. The anon key is
 * safe in the browser because every table is protected by Row Level Security.
 * Never put the service-role key, OpenAI key or payment secrets in VITE_* vars:
 * anything prefixed VITE_ is bundled into public JavaScript.
 *
 * When the variables are absent the client is null and the app runs with
 * accounts disabled (forms show a "not connected" notice instead of failing).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const isSupabaseConfigured = supabase !== null;
