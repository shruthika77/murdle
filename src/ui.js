export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function toast(msg, bad = false) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), bad ? 6000 : 3500);
}

export function flash(teamName) {
  const f = document.getElementById('flash');
  f.innerHTML = `<div class="flash"><div>🔍 Case solved!<span>${esc(teamName)}</span></div></div>`;
  setTimeout(() => (f.innerHTML = ''), 4000);
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

export function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); }
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

/** Runs an async click handler: disables the button while it runs and shows errors as a toast. */
export function guard(btn, fn) {
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    try { await fn(); } catch (e) { toast(e.message || String(e), true); }
    finally { btn.disabled = false; }
  });
}

export function topbar(right = '') {
  return `<header class="topbar"><a class="brand" href="#/">🔍 Case Closed</a>${right}</header>`;
}
