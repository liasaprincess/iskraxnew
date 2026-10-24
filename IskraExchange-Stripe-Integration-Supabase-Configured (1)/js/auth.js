import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

if (SUPABASE_URL.startsWith('REPLACE_') || SUPABASE_PUBLISHABLE_KEY.startsWith('REPLACE_')) {
  console.warn('Set the public Supabase URL and publishable key in js/config.js before testing.');
}
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export async function getAccessToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error('Please sign in again to continue.');
  return session.access_token;
}
