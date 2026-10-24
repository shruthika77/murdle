import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);
export const sb = configured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export async function session() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Returns { user, role } where role is 'admin' | 'pending' | 'team' | null */
export async function whoAmI() {
  const s = await session();
  if (!s) return { user: null, role: null };
  const { data } = await sb.from('profiles').select('role').eq('id', s.user.id).maybeSingle();
  return { user: s.user, role: data?.role ?? null };
}

/** Players are signed in anonymously so each device has a stable identity. */
export async function ensurePlayerSession() {
  const s = await session();
  if (s) return s.user;
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    throw new Error('Could not start a player session. The host needs to enable anonymous sign-ins in Supabase. (' + error.message + ')');
  }
  return data.user;
}

// Countdowns use the database clock, not the device clock, so a wrong phone clock can't change the timer.
let offset = 0;
export async function syncClock() {
  try {
    const t0 = Date.now();
    const { data } = await sb.rpc('server_time');
    const t1 = Date.now();
    if (data) offset = new Date(data).getTime() - (t0 + t1) / 2;
  } catch { /* keep previous offset */ }
}
export const serverNow = () => Date.now() + offset;
