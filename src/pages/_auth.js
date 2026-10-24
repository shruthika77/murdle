import { sb, whoAmI } from '../supabase.js';
import { esc, topbar, guard, $ } from '../ui.js';

/** Gate for host pages. Returns the user, or null after redirecting / showing a message. */
export async function requireAdmin(app) {
  const { user, role } = await whoAmI();
  if (!user || role === 'team' || !role) { location.hash = '#/admin/login'; return null; }
  if (role === 'pending') {
    app.innerHTML = topbar() + `<main><div class="card"><h2>Waiting for approval</h2>
      <p>Your account (${esc(user.email)}) has been created, but it is not a host account yet.
      An existing host or the project owner needs to add your email to the
      <code>admin_allowlist</code> table in Supabase, then you can sign in again.</p>
      <button class="btn k" id="out">Sign out</button></div></main>`;
    guard($('#out'), async () => { await sb.auth.signOut(); location.hash = '#/'; });
    return null;
  }
  return user;
}
