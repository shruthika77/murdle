import { esc, icon, badge, fmtTime } from './ui.js';
import { caseHtml } from './puzzles.js';
import { mountGrid } from './grid.js';
import { caseBanner } from './themes.js';

/**
 * One game-play layout for every screen: the team's phone, the host console and the projector.
 *
 *   [ big case banner with the round timer                  ]
 *   [ case file (story, line-up, evidence, clues) ] [ answer / sealed  ]
 *   [ deduction grid (full width of the column)   ] [ + optional extras]
 *   [ + optional extras (notebook)                ]   (sticky on wide screens)
 *
 * The shell is written once; drawCaseView() only replaces the .cv-* parts, so anything a page puts in
 * the extra slots (team panel, answer form, notebook) is left alone.
 */
export const caseViewShell = ({ leftExtra = '', sideExtra = '', gridTitle = 'Deduction grid' } = {}) => `
  <div class="cv">
    <div class="cv-banner"></div>
    <div class="cols cv-cols">
      <div class="stack cv-main"><div class="card paper cv-case"></div>
        <div class="card cv-gridcard"><div class="card-h"><h3>${icon('search', 18)} ${gridTitle}</h3></div>
          <div class="cv-grid"></div><p class="muted xs mt-2 cv-note"></p></div>
        ${leftExtra}</div>
      <div class="stack cv-side"><div class="cv-answer"></div>${sideExtra}</div>
    </div>
  </div>`;

const timerSlot = (p) => `<div class="cb-timer">${p === 'live'
  ? `<div class="time cv-time">–:––</div><div class="bar cv-bar"><i style="width:100%"></i></div><div class="xs">time left</div>`
  : badge('ok', 'Round closed')}</div>`;

export function answerCardHtml(r) {
  const sol = r.revealed && r.reveal ? r.reveal.solution : null;
  return sol
    ? `<div class="card answer"><div class="kicker">Solution</div><p class="ans"><b>${esc(sol.suspect)}</b> with the <b>${esc(sol.weapon)}</b> in the <b>${esc(sol.location)}</b></p>
        <p class="sm" style="margin:0">${esc(r.reveal.explanation || '')}</p></div>`
    : `<div class="card sealed"><div class="seal" aria-hidden="true">🔒</div><div><b>Answer sealed</b>
        <p class="muted sm" style="margin:0">Hidden from everyone, the host included, until “Reveal answer” is pressed.</p></div></div>`;
}

/**
 * Draws the banner, case file, grid and answer card for round `r`.
 * Returns the grid handle (or null while the case text is still loading).
 */
export function drawCaseView(root, { r, content, phase, ruled = new Set(), gridKey, note = '', label = '' }) {
  const q = (s) => root.querySelector(s);
  const sol = r.revealed && r.reveal ? r.reveal.solution : null;
  q('.cv-banner').innerHTML = caseBanner(r, content, { big: true, right: timerSlot(phase), label });
  q('.cv-case').innerHTML = content ? caseHtml(content, esc, ruled) : '<p class="muted">Opening the case file…</p>';
  q('.cv-note').textContent = note;
  q('.cv-answer').innerHTML = answerCardHtml(r);
  if (!content) { q('.cv-grid').innerHTML = '<p class="muted">The grid appears with the case file.</p>'; return null; }
  return mountGrid(q('.cv-grid'), content, gridKey, { solution: sol });
}

/** Updates the banner clock. Pages call it from their tick with their synced clock values. */
export function setCaseViewTime(root, left, total) {
  const el = root.querySelector('.cv-time'), bar = root.querySelector('.cv-bar > i');
  if (el) { el.textContent = fmtTime(left); el.classList.toggle('low', left <= 30); }
  if (bar) { bar.style.width = Math.max(0, Math.min(100, (left / Math.max(1, total)) * 100)) + '%'; bar.classList.toggle('low', left <= 30); }
}
