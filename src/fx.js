import { suspectSvg } from './avatars.js';
import { weaponIcon, placeIcon } from './themes.js';
import { sfx } from './sfx.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Paper confetti in the case palette. */
export function confetti(n = 90) {
  if (reduced()) return;
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['#ffd23f', '#e2384d', '#3ec5b7', '#f6f1e7', '#8e7cc3'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.6}s;animation-duration:${2 + Math.random() * 1.6}s;--r:${Math.random() * 720 - 360}deg;--x:${Math.random() * 160 - 80}px`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4200);
}

/**
 * The reveal ceremony: three evidence cards flip over one by one, then the CASE CLOSED stamp lands.
 * Plays on every screen at the moment the host presses "Reveal answer".
 */
export function revealCeremony(reveal, title = '') {
  if (!reveal?.solution) return;
  const s = reveal.solution;
  const root = document.createElement('div');
  root.className = 'ceremony'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Answer revealed');
  root.innerHTML = `<div class="cer-in"><div class="cer-h">The case of “${esc(title)}”</div>
    <div class="cer-cards">
      <div class="ev" style="--d:.25s"><div class="ev-f"><div class="ev-back">?</div><div class="ev-front"><div class="ev-mug">${suspectSvg(s.suspect, 120)}</div><b>${esc(s.suspect)}</b><span>The culprit</span></div></div></div>
      <div class="ev" style="--d:1.05s"><div class="ev-f"><div class="ev-back">?</div><div class="ev-front"><div class="ev-ico">${weaponIcon(s.weapon)}</div><b>${esc(s.weapon)}</b><span>The weapon</span></div></div></div>
      <div class="ev" style="--d:1.85s"><div class="ev-f"><div class="ev-back">?</div><div class="ev-front"><div class="ev-ico">${placeIcon(s.location)}</div><b>${esc(s.location)}</b><span>The scene</span></div></div></div>
    </div>
    <div class="stamp" aria-hidden="true">Case closed</div>
    <button class="btn sec sm cer-x" type="button">Close</button></div>`;
  document.body.appendChild(root);
  sfx.sting();
  const fast = reduced();
  [250, 1050, 1850].forEach((ms) => setTimeout(() => sfx.pop(), fast ? 0 : ms));
  setTimeout(() => { sfx.stamp(); confetti(70); }, fast ? 0 : 2700);
  const close = () => { root.classList.add('out'); setTimeout(() => root.remove(), 300); };
  root.querySelector('.cer-x').onclick = close;
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  setTimeout(close, 8000);
}
