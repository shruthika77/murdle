import { avatarSvg } from './avatars.js';
import { soundOn, setSound, sfx } from './sfx.js';
import { confetti } from './fx.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- icons (Lucide-style, stroke) ---------- */
const ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  weapon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-1.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98 1.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  wand: '<path d="m15 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1zM4 20 15 9M19 13l.7 1.3L21 15l-1.3.7L19 17l-.7-1.3L17 15l1.3-.7z"/>',
  eraser: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 21M22 21H7M5 11l9 9"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  door: '<path d="M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01M13 4.56v16a1 1 0 0 1-1.24.97l-7-1.75A1 1 0 0 1 4 19.78V5.78a1 1 0 0 1 .76-.97l7-1.75A1 1 0 0 1 13 4.03z"/>',
};
export const icon = (name, size = 18) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

export const badge = (kind, text) => `<span class="badge ${kind}">${text}</span>`;
export const statusBadge = (s) =>
  s === 'active' ? badge('live', 'In play') : s === 'finished' ? badge('ok', 'Finished') : badge('', 'Lobby');

export function avatar(name, big = false, cfg = null) {
  if (cfg) return `<span class="av img${big ? ' lg' : ''}">${avatarSvg(cfg, big ? 40 : 30)}</span>`;
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const ini = String(name).trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
  return `<span class="av${big ? ' lg' : ''}" style="--h:${h}" aria-hidden="true">${esc(ini || '?')}</span>`;
}

/** Overlapping avatars for a team (max 3 shown). */
export function avatarStack(members, big = false) {
  const shown = members.slice(0, 3);
  return `<span class="av-stack">${shown.map((m) => avatar(m.player_name, big, m.avatar)).join('')}${members.length > 3 ? `<span class="av more">+${members.length - 3}</span>` : ''}</span>`;
}

export function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  return s < 10 ? 'just now' : s < 60 ? Math.floor(s) + 's ago' : s < 3600 ? Math.floor(s / 60) + 'm ago' : Math.floor(s / 3600) + 'h ago';
}

/** Page header. `right` is extra HTML (buttons / user info). A sound toggle is always included. */
export function topbar(right = '') {
  return `<header class="app-header"><div class="tape" aria-hidden="true"><span>${TAPE}${TAPE}</span></div>
    <div class="in"><a class="site-brand" href="#/"><span class="logo">${BRAND}</span><span>Case <em>Closed</em></span></a>${right}
    <button class="btn sm ghost snd" type="button" data-sound aria-pressed="${soundOn()}" aria-label="Sound effects" title="Sound effects">${soundOn() ? '🔊' : '🔇'}</button></div></header>`;
}
const TAPE = 'Crime scene &nbsp;✕&nbsp; do not cross &nbsp;✕&nbsp; '.repeat(6);
const BRAND = `<svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><circle cx="17" cy="17" r="11" fill="#fff1b0" stroke="#111a33" stroke-width="3.5"/>
  <path d="M25 25L35 35" stroke="#141a2e" stroke-width="6" stroke-linecap="round"/><path d="M25 25L35 35" stroke="#ff5d73" stroke-width="3" stroke-linecap="round"/>
  <path d="M11 14Q13 10 17 10" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sound]'); if (!b) return;
  setSound(!soundOn()); b.textContent = soundOn() ? '🔊' : '🔇'; b.setAttribute('aria-pressed', soundOn());
  if (soundOn()) sfx.pop();
});

/* ---------- toasts / flash ---------- */
export function toast(msg, bad = false) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), bad ? 6000 : 3500);
}

/** Big celebration (own team, or projector). */
export function flash(teamName) {
  const f = document.getElementById('flash');
  f.innerHTML = `<div class="flash"><div class="burst"><div class="s">Case cracked!</div><div class="t">Gotcha!</div><div class="n">${esc(teamName)}</div></div></div>`;
  sfx.solved(); confetti();
  setTimeout(() => (f.innerHTML = ''), 3200);
}

/* ---------- get-ready overlay (shared by players and the projector) ---------- */
const CIRC = 2 * Math.PI * 88;
export function showGetReady(left, total, title) {
  const root = document.getElementById('overlay');
  if (!root.firstChild) {
    root.innerHTML = `<div class="ready-overlay" role="alert"><div class="ready-card">
      <div class="gr-tag">Briefing in progress</div><h2 id="gr-title"></h2>
      <div class="ring"><svg viewBox="0 0 200 200"><circle class="bg" cx="100" cy="100" r="88"/>
        <circle class="fg" cx="100" cy="100" r="88" stroke-dasharray="${CIRC}" id="gr-ring"/></svg><div class="n" id="gr-n"></div></div>
      <p>The case file opens when the clock reaches zero. Sharpen your pencils, detectives.</p></div></div>`;
  }
  $('#gr-title', root).textContent = title;
  const n = Math.max(0, Math.ceil(left)), el = $('#gr-n', root);
  if (el.textContent !== String(n)) { el.textContent = n; if (n <= 3) sfx.beep(n === 0); }
  const frac = Math.min(1, Math.max(0, left / Math.max(total, 1)));
  $('#gr-ring', root).style.strokeDashoffset = String(CIRC * (1 - frac));
}
/** Removes the countdown. `go` plays the "case open" jingle (pass true when the round has just gone live). */
export function hideGetReady(go = false) {
  const o = document.getElementById('overlay');
  if (o.firstChild) { o.innerHTML = ''; if (go) sfx.start(); }
}

/* ---------- misc ---------- */
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
export function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  catch { toast('Copy failed. Select the text and copy it manually.', true); }
}
export function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export const joinUrl = (code) => `${location.origin}${location.pathname}#/join/${code}`;

/** Async click handler: disables the button while it runs and shows errors as a toast. */
export function guard(btn, fn) {
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    try { await fn(); } catch (e) { toast(e.message || String(e), true); }
    finally { btn.disabled = false; }
  });
}
