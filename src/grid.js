import { esc, icon } from './ui.js';

/**
 * Murdle-style connected deduction grid.
 *
 *            SUSPECTS      WEAPONS
 *   LOCATIONS [ block LS ] [ block LW ]
 *   WEAPONS   [ block WS ] [  (unused) ]
 *
 * One shared set of headers, three blocks, exactly like the printed puzzle grid.
 */
export const GRID_BLOCKS = ['LS', 'LW', 'WS'];
export const emptyGrid = (n = 3) => Object.fromEntries(GRID_BLOCKS.map((b) => [b, Array(n * n).fill('')]));

const X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const V = '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 6.5"/></svg>';
export const MARK = { x: X, v: V };

export function gridHtml(c, state) {
  const n = c.suspects.length;
  const S = c.suspects, W = c.weapons, L = c.locations;
  const at = (r, col) => `style="grid-row:${r};grid-column:${col}"`;
  let h = `<div class="mgrid" style="--n2:${n * 2}" role="group" aria-label="Deduction grid">`;
  h += `<div class="corner" ${at('1 / 3', '1 / 3')}>${icon('search', 44)}</div>`;

  // category labels
  h += `<div class="cat" ${at(1, `3 / span ${n}`)}>${icon('user', 14)} Suspects</div>`;
  h += `<div class="cat" ${at(1, `${3 + n} / span ${n}`)}>${icon('weapon', 14)} Weapons</div>`;
  h += `<div class="cat v" ${at(`3 / span ${n}`, 1)}>${icon('pin', 14)} Locations</div>`;
  h += `<div class="cat v" ${at(`${3 + n} / span ${n}`, 1)}>${icon('weapon', 14)} Weapons</div>`;

  // item headers
  S.forEach((s, i) => (h += `<div class="hd col" ${at(2, 3 + i)} title="${esc(s.name)}">${esc(s.name)}</div>`));
  W.forEach((w, i) => (h += `<div class="hd col" ${at(2, 3 + n + i)} title="${esc(w.name)}">${esc(w.name)}</div>`));
  L.forEach((l, i) => (h += `<div class="hd row" ${at(3 + i, 2)} title="${esc(l.name)}">${esc(l.name)}</div>`));
  W.forEach((w, i) => (h += `<div class="hd row" ${at(3 + n + i, 2)} title="${esc(w.name)}">${esc(w.name)}</div>`));

  // blocks: key, row offset, col offset, row items, col items
  const blocks = [
    ['LS', 3, 3, L, S],
    ['LW', 3, 3 + n, L, W],
    ['WS', 3 + n, 3, W, S],
  ];
  for (const [key, r0, c0, rows, cols] of blocks) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = state[key][i * n + j];
      const cls = ['cell', v, j === 0 && 'bl', j === n - 1 && 'br', i === 0 && 'bt', i === n - 1 && 'bb'].filter(Boolean).join(' ');
      const label = `${rows[i].name} and ${cols[j].name}: ${v === 'x' ? 'ruled out' : v === 'v' ? 'confirmed' : 'unknown'}`;
      h += `<button type="button" class="${cls}" ${at(r0 + i, c0 + j)} data-b="${key}" data-i="${i}" data-j="${j}" aria-label="${esc(label)}">${v ? MARK[v] : ''}</button>`;
    }
  }
  // unused corner block
  h += `<div class="void" ${at(`${3 + n} / span ${n}`, `${3 + n} / span ${n}`)}></div>`;
  return h + '</div>';
}

export const nextMark = (v) => (v === '' ? 'x' : v === 'x' ? 'v' : '');
export const legendHtml = () =>
  `<div class="legend"><span><svg viewBox="0 0 24 24" style="stroke:var(--red)"><path d="M6 6l12 12M18 6 6 18"/></svg> Ruled out</span>
   <span><svg viewBox="0 0 24 24" style="stroke:var(--teal)"><path d="M4.5 12.5l5 5L19.5 6.5"/></svg> Confirmed</span>
   <span>Tap a square to cycle: blank, ruled out, confirmed</span></div>`;
