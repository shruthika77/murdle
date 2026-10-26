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

/** Cells that make up the revealed answer: { LS: idx, LW: idx, WS: idx }. */
export function solutionCells(c, sol) {
  if (!sol) return null;
  const n = c.suspects.length, iS = c.suspects.findIndex((x) => x.name === sol.suspect),
    iW = c.weapons.findIndex((x) => x.name === sol.weapon), iL = c.locations.findIndex((x) => x.name === sol.location);
  if (iS < 0 || iW < 0 || iL < 0) return null;
  return { LS: iL * n + iS, LW: iL * n + iW, WS: iW * n + iS };
}

export function gridHtml(c, state, { solution = null, readOnly = false } = {}) {
  const n = c.suspects.length;
  const S = c.suspects, W = c.weapons, L = c.locations;
  const sol = solutionCells(c, solution);
  const at = (r, col) => `style="grid-row:${r};grid-column:${col}"`;
  let h = `<div class="mgrid" style="--n2:${n * 2}" role="group" aria-label="Deduction grid">`;
  h += `<div class="corner" ${at('1 / 3', '1 / 3')}>${icon('search', 44)}</div>`;

  h += `<div class="cat" ${at(1, `3 / span ${n}`)}>${icon('user', 14)} Suspects</div>`;
  h += `<div class="cat" ${at(1, `${3 + n} / span ${n}`)}>${icon('weapon', 14)} Weapons</div>`;
  h += `<div class="cat v" ${at(`3 / span ${n}`, 1)}>${icon('pin', 14)} Locations</div>`;
  h += `<div class="cat v" ${at(`${3 + n} / span ${n}`, 1)}>${icon('weapon', 14)} Weapons</div>`;

  S.forEach((s, i) => (h += `<div class="hd col" ${at(2, 3 + i)} title="${esc(s.name)}">${esc(s.name)}</div>`));
  W.forEach((w, i) => (h += `<div class="hd col" ${at(2, 3 + n + i)} title="${esc(w.name)}">${esc(w.name)}</div>`));
  L.forEach((l, i) => (h += `<div class="hd row" ${at(3 + i, 2)} title="${esc(l.name)}">${esc(l.name)}</div>`));
  W.forEach((w, i) => (h += `<div class="hd row" ${at(3 + n + i, 2)} title="${esc(w.name)}">${esc(w.name)}</div>`));

  const blocks = [['LS', 3, 3, L, S], ['LW', 3, 3 + n, L, W], ['WS', 3 + n, 3, W, S]];
  for (const [key, r0, c0, rows, cols] of blocks) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = state[key][i * n + j];
      const isSol = sol && sol[key] === i * n + j;
      const cls = ['cell', v, isSol && 'sol', j === 0 && 'bl', j === n - 1 && 'br', i === 0 && 'bt', i === n - 1 && 'bb'].filter(Boolean).join(' ');
      const label = `${rows[i].name} and ${cols[j].name}: ${v === 'x' ? 'ruled out' : v === 'v' ? 'confirmed' : 'unknown'}${isSol ? ' (the answer)' : ''}`;
      h += `<button type="button" class="${cls}" ${at(r0 + i, c0 + j)} data-b="${key}" data-i="${i}" data-j="${j}" aria-label="${esc(label)}"${readOnly ? ' disabled' : ''}>${v ? MARK[v] : ''}</button>`;
    }
  }
  h += `<div class="void" ${at(`${3 + n} / span ${n}`, `${3 + n} / span ${n}`)}></div>`;
  return h + '</div>';
}

export const nextMark = (v) => (v === '' ? 'x' : v === 'x' ? 'v' : '');

/**
 * Sets one cell. With smart mode on, confirming a pair (✓) crosses out the rest of its row and column
 * in that block, and a row or column with only one blank left and no ✓ gets that blank confirmed.
 */
export function applyMark(g, n, key, i, j, v, smart) {
  g[key][i * n + j] = v;
  if (!smart) return g;
  const b = g[key];
  if (v === 'v') {
    for (let k = 0; k < n; k++) {
      if (k !== j && b[i * n + k] === '') b[i * n + k] = 'x';
      if (k !== i && b[k * n + j] === '') b[k * n + j] = 'x';
    }
  }
  // single remaining square in a line -> confirm it (only after the player has crossed things out)
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 0; r < n; r++) {
      const row = [...Array(n).keys()].map((k) => r * n + k);
      const col = [...Array(n).keys()].map((k) => k * n + r);
      for (const line of [row, col]) {
        if (line.some((x) => b[x] === 'v')) continue;
        const blanks = line.filter((x) => b[x] === '');
        if (blanks.length === 1 && line.filter((x) => b[x] === 'x').length === n - 1) {
          const x = blanks[0]; b[x] = 'v';
          const ri = Math.floor(x / n), ci = x % n;
          for (let k = 0; k < n; k++) {
            if (b[ri * n + k] === '') b[ri * n + k] = 'x';
            if (b[k * n + ci] === '') b[k * n + ci] = 'x';
          }
        }
      }
    }
  }
  return g;
}

/** Share of the 27 squares that hold a mark. */
export const gridProgress = (g) => {
  const all = GRID_BLOCKS.flatMap((k) => g[k]);
  return Math.round((all.filter(Boolean).length / all.length) * 100);
};

export const legendHtml = (smart = null) =>
  `<div class="legend"><span><svg viewBox="0 0 24 24" style="stroke:var(--red)"><path d="M6 6l12 12M18 6 6 18"/></svg> Ruled out</span>
   <span><svg viewBox="0 0 24 24" style="stroke:var(--teal)"><path d="M4.5 12.5l5 5L19.5 6.5"/></svg> Confirmed</span>
   <span>Tap a square: blank → ruled out → confirmed</span>
   ${smart !== null ? `<label class="smart"><input type="checkbox" data-smart${smart ? ' checked' : ''}> Smart marks <span class="muted xs">(✓ crosses out the rest of its row and column)</span></label>` : ''}</div>`;

/**
 * Wires up a grid card inside `root` for one round.
 * storageKey: where the marks live on this device. opts.solution: highlight the answer once revealed.
 */
export function mountGrid(root, content, storageKey, { solution = null, onChange = () => {} } = {}) {
  const smartKey = 'cc_smart';
  const load = () => {
    try { const g = JSON.parse(localStorage.getItem(storageKey)); if (g && g.LS && g.LW && g.WS) return g; } catch { /* ignore */ }
    return emptyGrid(content.suspects.length);
  };
  const save = (g) => { try { localStorage.setItem(storageKey, JSON.stringify(g)); } catch { /* storage blocked */ } };
  const smart = () => localStorage.getItem(smartKey) !== 'off';
  function draw() {
    const g = load();
    root.innerHTML = `<div class="gridwrap">${gridHtml(content, g, { solution })}</div>
      <div class="gprog"><span>Deduction progress</span><div class="bar"><i style="width:${gridProgress(g)}%"></i></div><b>${gridProgress(g)}%</b></div>
      <div class="mt-2">${legendHtml(smart())}</div>`;
  }
  root.onclick = (e) => {
    const b = e.target.closest('.cell'); if (!b || b.disabled) return;
    const n = content.suspects.length, g = load(), k = b.dataset.b, i = +b.dataset.i, j = +b.dataset.j;
    applyMark(g, n, k, i, j, nextMark(g[k][i * n + j]), smart());
    save(g); draw(); onChange(g);
  };
  root.onchange = (e) => {
    if (e.target.matches('[data-smart]')) { localStorage.setItem(smartKey, e.target.checked ? 'on' : 'off'); }
  };
  draw();
  return { redraw: draw, clear: () => { localStorage.removeItem(storageKey); draw(); }, setSolution: (s) => { solution = s; draw(); } };
}
