import './style.css';
import { configured, setMode } from './supabase.js';
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
    app.innerHTML = topbar() + `<main class="wrap"><div class="narrow"><div class="card"><h2>Setup needed</h2>
      <p class="muted mt-2">This site is missing its Supabase settings. Set <code>VITE_SUPABASE_URL</code> and
      <code>VITE_SUPABASE_ANON_KEY</code> (in a local <code>.env</code> file, or in Render’s environment
      variables) and rebuild.</p></div></div></main>`;
    return;
  }

  const path = location.hash.slice(1) || '/';
  for (const [re, load] of routes) {
    const m = path.match(re);
    if (!m) continue;
    setMode(/^\/admin/.test(path) ? 'host' : 'player');   // board.js picks its own mode
    app.innerHTML = topbar() + '<main class="wrap"><p class="muted">Loading…</p></main>';
    try {
      const mod = await load();
      if (my !== token) return;
      const c = await mod.mount(app, m.slice(1));
      if (my !== token) { if (c) c(); return; }
      cleanup = c || null;
    } catch (e) {
      if (my !== token) return;
      app.innerHTML = topbar() + `<main class="wrap"><div class="narrow"><div class="card"><h2>Something went wrong</h2>
        <p class="mt-2" style="color:var(--red)">${esc(e.message || e)}</p><a class="btn sec mt" href="#/">Back to start</a></div></div></main>`;
    }
    return;
  }
  app.innerHTML = topbar() + '<main class="wrap"><div class="narrow"><div class="card center"><h2>Page not found</h2><a class="btn sec mt" href="#/">Back to start</a></div></div></main>';
}

window.addEventListener('hashchange', route);
route();
