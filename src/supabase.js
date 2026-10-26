import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);

/*
 * Two independent sign-in sessions live side by side in the browser:
 *  - "host"   : email + password account (default storage key)
 *  - "player" : anonymous player identity (separate storage key)
 * So a host can open a join link in another tab of the same browser and play as a team
 * without signing out, and a player device never interferes with a host login.
 */
const make = (storageKey) => createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, ...(storageKey ? { storageKey } : {}) },
});
const hostClient = configured ? make(null) : null;
const playerClient = configured ? make('cc-player-auth') : null;

let mode = 'player';
export const setMode = (m) => { mode = m; };
export const getMode = () => mode;
export const client = () => (mode === 'host' ? hostClient : playerClient);

/** Convenience handle that always points at the client for the current screen. */
export const sb = new Proxy({}, {
  get(_, prop) {
    const c = client();
    const v = c[prop];
    return typeof v === 'function' ? v.bind(c) : v;
  },
});

async function roleFor(c) {
  const { data: s } = await c.auth.getSession();
  const user = s.session?.user || null;
  if (!user) return { user: null, role: null };
  const { data } = await c.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return { user, role: data?.role ?? null };
}
export const hostIdentity = () => roleFor(hostClient);
export const playerIdentity = () => roleFor(playerClient);

/** Identity for the current screen's mode. */
export const whoAmI = () => roleFor(client());

/** Players are signed in anonymously so each device has a stable identity. */
export async function ensurePlayerSession() {
  const { data: s } = await playerClient.auth.getSession();
  if (s.session) return s.session.user;
  const { data, error } = await playerClient.auth.signInAnonymously();
  if (error) {
    throw new Error('Could not start a player session. The host needs to enable anonymous sign-ins in Supabase. (' + error.message + ')');
  }
  return data.user;
}

// Countdowns use the database clock, not the device clock.
let offset = 0;
export async function syncClock() {
  try {
    const t0 = Date.now();
    const { data } = await client().rpc('server_time');
    const t1 = Date.now();
    if (data) offset = new Date(data).getTime() - (t0 + t1) / 2;
  } catch { /* keep previous offset */ }
}
export const serverNow = () => Date.now() + offset;
