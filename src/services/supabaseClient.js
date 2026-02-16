import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Klient Supabase — null jeśli brak konfiguracji (.env).
 * Gdy supabase === null, aplikacja działa w trybie localStorage-only.
 */
export const supabase = url && key ? createClient(url, key) : null;

export function isSupabaseConfigured() {
  return !!supabase;
}
