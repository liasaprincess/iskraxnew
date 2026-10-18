
import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qoeedfnttqejgqopgbmb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_jgZ55NHhv4FHKUIIpoLgAg_yXRbI3oB";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

export async function signUp(email, password) {
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        "https://www.iskraexchange.cc/auth/callback.html"
    }
  });
}

export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({
    email,
    password
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}
