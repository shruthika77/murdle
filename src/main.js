import './style.css';
import { configured } from './supabase.js';
import { esc, topbar } from './ui.js';

const routes = [
  [/^\/?$/, () => import('./pages/home.js')],
  [/^\/admin\/login$/, () => import('./pages/login.js')],
  [/^\/admin$/, () => import('./pages/admin.js')],
  [/^\/admin\/game\/([0-9a-f-]{36})$/i, () => import('./pages/gamectl.js')],
  [/^\/join\/([a-z0-9]{4,32})$/i, () => import('./pages/join.js')],
  [/^\/play\/([0-9a-f-]{36})$/i, () => import('./pages/play.js')],
  [/^\/board\/([0-9a-f-]{36})$/i, () => import('./pages/board.js')],
];

let cleanup = null;
let token = 0;

async function route() {
  const my = ++token;
  if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  document.body.classList.remove('projector');
  document.getElementById('flash').innerHTML = '';
  const app = document.getElementById('app');

  if (!configured) {
    app.innerHTML = topbar() + `<main><div class="card"><h2>Setup needed</h2>
      <p>This site is missing its Supabase settings. Set <code>VITE_SUPABASE_URL</code> and
      <code>VITE_SUPABASE_ANON_KEY</code> (in a local <code>.env</code> file, or in Render's environment
      variables) and rebuild.</p></div></main>`;
    return;
  }

  const path = location.hash.slice(1) || '/';
  for (const [re, load] of routes) {
    const m = path.match(re);
    if (!m) continue;
    app.innerHTML = '<main><p class="mut">Loading…</p></main>';
    try {
      const mod = await load();
      if (my !== token) return;
      const c = await mod.mount(app, m.slice(1));
      if (my !== token) { if (c) c(); return; }
      cleanup = c || null;
    } catch (e) {
      if (my !== token) return;
      app.innerHTML = topbar() + `<main><div class="card"><h2>Something went wrong</h2>
        <p class="err">${esc(e.message || e)}</p><p><a href="#/">Back to start</a></p></div></main>`;
    }
    return;
  }
  app.innerHTML = topbar() + '<main><div class="card"><h2>Page not found</h2><p><a href="#/">Back to start</a></p></div></main>';
}

window.addEventListener('hashchange', route);
route();
