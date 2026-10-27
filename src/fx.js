import { suspectSvg } from './avatars.js';
import { weaponIcon, placeIcon } from './themes.js';
import { sfx } from './sfx.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Paper confetti in the case palette. */
export function confetti(n = 90) {
  if (reduced()) return;
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const cols = ['#ffcd3c', '#ff4f64', '#3fcfb8', '#f8f4e8', '#8f86e8', '#ffe066'];
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

/**
 * Winners ceremony for the end of the game. Runs on every screen when the host crowns the winners:
 * spotlights sweep, then 3rd, 2nd and 1st place rise one by one, a crown drops on the champions,
 * and the room gets a fanfare and confetti.
 * winners: [{ place, name, total, solved, avatars (html), rank }] (already escaped html in `avatars` only).
 */
export function winnersCeremony(winners, { title = '', meTeamId = null, meLine = '' } = {}) {
  if (!winners?.length || document.querySelector('.crowning')) return;
  const fast = reduced();
  const at = { 3: 900, 2: 2600, 1: 4600 };
  const order = winners.length === 1 ? [1] : winners.length === 2 ? [2, 1] : [2, 1, 3];
  const label = { 1: 'Champions', 2: 'Second place', 3: 'Third place' };
  const medal = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const root = document.createElement('div');
  root.className = 'crowning'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Winners');
  root.innerHTML = `<div class="cr-beams" aria-hidden="true"><i></i><i></i></div>
    <div class="cr-in">
      <div class="cr-k">${esc(title)}</div>
      <h2 class="cr-h">The top detectives are…</h2>
      <div class="cr-podium">${order.map((p) => { const w = winners.find((x) => x.place === p); if (!w) return '';
        return `<div class="cr-col c${p}${w.id === meTeamId ? ' me' : ''}" style="--d:${fast ? 0 : at[p]}ms">
          <div class="cr-card">${p === 1 ? '<div class="cr-crown" aria-hidden="true">👑</div>' : ''}
            <div class="cr-av">${w.avatars}</div><div class="cr-name">${esc(w.name)}</div>
            <div class="cr-pts">${w.total} points</div><div class="cr-lbl">${medal[p]} ${label[p]}</div>
            ${w.id === meTeamId ? '<div class="cr-you">That’s your team!</div>' : ''}</div>
          <div class="cr-block"><span>${p}</span></div></div>`; }).join('')}</div>
      ${meLine ? `<p class="cr-me">${esc(meLine)}</p>` : ''}
      <button class="btn cr-x" type="button">See the final standings</button>
    </div>`;
  document.body.appendChild(root);
  if (fast) { confetti(120); sfx.fanfare(); }
  else {
    order.slice().sort((a, b) => b - a).forEach((p) => {
      setTimeout(() => sfx.drumroll(p === 1 ? 1.4 : 0.8), Math.max(0, at[p] - (p === 1 ? 1400 : 800)));
      setTimeout(() => { if (p === 1) { sfx.fanfare(); sfx.cheer(); confetti(160); } else { sfx.stamp(); confetti(50); } }, at[p] + 350);
    });
    setTimeout(() => confetti(140), at[1] + 2200);
  }
  const close = () => { root.classList.add('out'); setTimeout(() => root.remove(), 350); };
  root.querySelector('.cr-x').onclick = close;
  document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
}
