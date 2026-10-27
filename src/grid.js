import { esc, icon } from './ui.js';

/**
 * Murdle-style connected deduction grid, shared by the team view, the host console and the projector.
 *
 *            SUSPECTS      WEAPONS
 *   LOCATIONS [ block LS ] [ block LW ]
 *   WEAPONS   [ block WS ] [  (unused) ]
 *
 * State: { LS, LW, WS: ['' | 'x' | 'v', …], auto: { LS, LW, WS: [bool, …] } }
 * `auto` flags the squares filled in by Smart marks, so they can be shown lighter and cleared on their own.
 */
export const GRID_BLOCKS = ['LS', 'LW', 'WS'];
const BLOCK_NAMES = { LS: 'Locations × Suspects', LW: 'Locations × Weapons', WS: 'Weapons × Suspects' };

export const emptyGrid = (n = 3) => ({
  ...Object.fromEntries(GRID_BLOCKS.map((b) => [b, Array(n * n).fill('')])),
  auto: Object.fromEntries(GRID_BLOCKS.map((b) => [b, Array(n * n).fill(false)])),
});

/** Brings grids saved by older versions (no `auto`) up to date. */
function normalize(g, n) {
  if (!g || !GRID_BLOCKS.every((b) => Array.isArray(g[b]) && g[b].length === n * n)) return emptyGrid(n);
  if (!g.auto) g.auto = {};
  for (const b of GRID_BLOCKS) if (!Array.isArray(g.auto[b]) || g.auto[b].length !== n * n) g.auto[b] = Array(n * n).fill(false);
  return g;
}

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

/** Lines that can't be right: two ✓ in one row/column, or every square ruled out. Returns a Set of "BLOCK:idx". */
export function conflicts(g, n) {
  const bad = new Set();
  for (const k of GRID_BLOCKS) {
    const b = g[k];
    for (let r = 0; r < n; r++) {
      const row = [...Array(n).keys()].map((c) => r * n + c);
      const col = [...Array(n).keys()].map((c) => c * n + r);
      for (const line of [row, col]) {
        const v = line.filter((x) => b[x] === 'v'), x = line.filter((i) => b[i] === 'x');
        if (v.length > 1) v.forEach((i) => bad.add(`${k}:${i}`));
        if (x.length === n) x.forEach((i) => bad.add(`${k}:${i}`));
      }
    }
  }
  return bad;
}

export function gridHtml(c, state, { solution = null, readOnly = false } = {}) {
  const n = c.suspects.length;
  const S = c.suspects, W = c.weapons, L = c.locations;
  const sol = solutionCells(c, solution);
  const bad = conflicts(state, n);
  const at = (r, col) => `style="grid-row:${r};grid-column:${col}"`;
  let h = `<div class="mgrid${sol ? ' solved' : ''}" style="--n2:${n * 2}" role="group" aria-label="Deduction grid">`;
  h += `<div class="corner" ${at('1 / 3', '1 / 3')}>${icon('search', 40)}</div>`;

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
      const idx = i * n + j, v = state[key][idx];
      const isSol = sol && sol[key] === idx;
      const cls = ['cell', v, v && state.auto?.[key]?.[idx] && 'auto', isSol && 'sol', bad.has(`${key}:${idx}`) && 'bad',
        j === 0 && 'bl', j === n - 1 && 'br', i === 0 && 'bt', i === n - 1 && 'bb'].filter(Boolean).join(' ');
      const label = `${rows[i].name} and ${cols[j].name}: ${v === 'x' ? 'ruled out' : v === 'v' ? 'confirmed' : 'unknown'}${isSol ? ' (the answer)' : ''}`;
      h += `<button type="button" class="${cls}" ${at(r0 + i, c0 + j)} data-b="${key}" data-i="${i}" data-j="${j}" aria-label="${esc(label)}"${readOnly ? ' disabled' : ''}>${v ? MARK[v] : ''}</button>`;
    }
  }
  h += `<div class="void" ${at(`${3 + n} / span ${n}`, `${3 + n} / span ${n}`)}></div>`;
  return h + '</div>';
}

export const nextMark = (v) => (v === '' ? 'x' : v === 'x' ? 'v' : '');

/* ---------- Smart marks ---------- */
function fill(g, k, idx, v) {
  if (g[k][idx] !== '') return false;
  g[k][idx] = v; g.auto[k][idx] = true; return true;
}

/**
 * Applies every deduction that follows from the marks already on the grid, until nothing changes:
 *  - a ✓ crosses out the rest of its row and column;
 *  - a row or column with one blank left and everything else ✗ gets that blank confirmed;
 *  - across blocks: if Location–Suspect ✓ and Location–Weapon ✓, then Weapon–Suspect ✓ (and the ✗ versions of that).
 * Smart marks only ever fill blank squares; they never overwrite a mark you made.
 */
function propagate(g, n) {
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (const k of GRID_BLOCKS) {
      const b = g[k];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (b[i * n + j] !== 'v') continue;
        for (let t = 0; t < n; t++) {
          if (t !== j) changed = fill(g, k, i * n + t, 'x') || changed;
          if (t !== i) changed = fill(g, k, t * n + j, 'x') || changed;
        }
      }
      for (let r = 0; r < n; r++) {
        const row = [...Array(n).keys()].map((c) => r * n + c);
        const col = [...Array(n).keys()].map((c) => c * n + r);
        for (const line of [row, col]) {
          if (line.some((x) => b[x] === 'v')) continue;
          const blanks = line.filter((x) => b[x] === '');
          if (blanks.length === 1 && line.filter((x) => b[x] === 'x').length === n - 1) changed = fill(g, k, blanks[0], 'v') || changed;
        }
      }
    }
    // cross-block logic: location l, suspect s, weapon w
    for (let l = 0; l < n; l++) for (let s = 0; s < n; s++) for (let w = 0; w < n; w++) {
      const ls = g.LS[l * n + s], lw = g.LW[l * n + w], ws = g.WS[w * n + s];
      const set = (k, idx, v) => (changed = fill(g, k, idx, v) || changed);
      if (ls === 'v' && lw === 'v') set('WS', w * n + s, 'v');
      if (ls === 'v' && ws === 'v') set('LW', l * n + w, 'v');
      if (lw === 'v' && ws === 'v') set('LS', l * n + s, 'v');
      if (ls === 'v' && lw === 'x') set('WS', w * n + s, 'x');
      if (ls === 'v' && ws === 'x') set('LW', l * n + w, 'x');
      if (lw === 'v' && ls === 'x') set('WS', w * n + s, 'x');
      if (lw === 'v' && ws === 'x') set('LS', l * n + s, 'x');
      if (ws === 'v' && ls === 'x') set('LW', l * n + w, 'x');
      if (ws === 'v' && lw === 'x') set('LS', l * n + s, 'x');
    }
    if (!changed) break;
  }
  return g;
}

/** Sets one square by hand, then (with Smart marks on) fills in everything that follows. */
export function applyMark(g, n, key, i, j, v, smart) {
  normalize(g, n);
  g[key][i * n + j] = v;
  g.auto[key][i * n + j] = false;
  return smart ? propagate(g, n) : g;
}

/** Share of the squares that hold a mark. */
export const gridProgress = (g) => {
  const all = GRID_BLOCKS.flatMap((k) => g[k]);
  return Math.round((all.filter(Boolean).length / all.length) * 100);
};

const legendHtml = () =>
  `<div class="legend"><span><i class="lg-cell x">${X}</i> Ruled out</span><span><i class="lg-cell v">${V}</i> Confirmed</span>
   <span><i class="lg-cell x auto">${X}</i> Added by Smart marks</span><span class="muted">Tap a square: blank → ✗ → ✓ → blank</span></div>`;

/**
 * Wires up a full grid panel (toolbar, grid, progress, legend) inside `root` for one round.
 * storageKey: where the marks live on this device. opts.solution: highlight the answer once revealed.
 * Used by the team view, the host console and the projector, so every screen gets the same tools.
 */
export function mountGrid(root, content, storageKey, { solution = null, onChange = () => {} } = {}) {
  const n = content.suspects.length;
  const smartKey = 'cc_smart';
  const undo = [], redo = [];
  const load = () => {
    try { return normalize(JSON.parse(localStorage.getItem(storageKey)), n); } catch { return emptyGrid(n); }
  };
  const save = (g) => { try { localStorage.setItem(storageKey, JSON.stringify(g)); } catch { /* storage blocked */ } };
  const smart = () => localStorage.getItem(smartKey) !== 'off';
  const commit = (g, before) => {
    undo.push(before); if (undo.length > 60) undo.shift();
    redo.length = 0; save(g); draw(); onChange(g);
  };

  function draw() {
    const g = load(), pct = gridProgress(g), bad = conflicts(g, n).size;
    const anyAuto = GRID_BLOCKS.some((k) => g.auto[k].some((a, i) => a && g[k][i]));
    const anyX = GRID_BLOCKS.some((k) => g[k].includes('x'));
    const blockHas = (k) => g[k].some(Boolean);
    const empty = !GRID_BLOCKS.some(blockHas);
    const sm = smart();
    root.innerHTML = `<div class="gtools" role="toolbar" aria-label="Grid tools">
        <div class="gt-pair"><button type="button" class="gt-btn" data-act="undo" title="Undo"${undo.length ? '' : ' disabled'}>${icon('undo', 16)}<span>Undo</span></button>
        <button type="button" class="gt-btn" data-act="redo" title="Redo"${redo.length ? '' : ' disabled'}>${icon('redo', 16)}<span>Redo</span></button></div>
        <button type="button" class="gt-switch" data-act="smart" role="switch" aria-checked="${sm}" title="Smart marks fill in what follows from your ✓ and ✗">
          <span class="sw" aria-hidden="true"><i></i></span>${icon('wand', 15)} Smart marks</button>
        <details class="gmenu"><summary class="gt-btn"${empty ? ' aria-disabled="true"' : ''}>${icon('eraser', 16)}<span>Clear</span>${icon('chev', 14)}</summary>
          <div class="gmenu-list" role="menu">
            <button type="button" role="menuitem" data-clear="auto"${anyAuto ? '' : ' disabled'}>${icon('wand', 15)} Smart marks only<small>Keep the squares you marked yourself</small></button>
            <button type="button" role="menuitem" data-clear="x"${anyX ? '' : ' disabled'}>${icon('x', 15)} All ✗ marks<small>Keep every ✓</small></button>
            <div class="gm-sep">One section</div>
            ${GRID_BLOCKS.map((k) => `<button type="button" role="menuitem" data-clear="${k}"${blockHas(k) ? '' : ' disabled'}>${icon('search', 15)} ${BLOCK_NAMES[k]}</button>`).join('')}
            <div class="gm-sep"></div>
            <button type="button" role="menuitem" data-clear="all" class="gm-danger"${empty ? ' disabled' : ''}>${icon('trash', 15)} Everything</button>
          </div></details>
      </div>
      <div class="gridwrap">${gridHtml(content, g, { solution })}</div>
      ${bad ? `<div class="gwarn" role="status">${icon('alert', 15)} Some marks contradict each other (outlined in red). Each row and column needs exactly one ✓.</div>` : ''}
      <div class="gprog"><span>Progress</span><div class="bar"><i style="width:${pct}%"></i></div><b>${pct}%</b></div>
      <div class="mt-2">${legendHtml()}</div>`;
  }

  function clear(kind) {
    const g = load(), before = JSON.parse(JSON.stringify(g));
    for (const k of GRID_BLOCKS) for (let i = 0; i < n * n; i++) {
      const hit = kind === 'all' || kind === k || (kind === 'x' && g[k][i] === 'x') || (kind === 'auto' && g.auto[k][i]);
      if (hit) { g[k][i] = ''; g.auto[k][i] = false; }
    }
    commit(g, before);
  }

  root.onclick = (e) => {
    const cell = e.target.closest('.cell');
    if (cell && !cell.disabled) {
      const g = load(), before = JSON.parse(JSON.stringify(g)), k = cell.dataset.b, i = +cell.dataset.i, j = +cell.dataset.j;
      applyMark(g, n, k, i, j, nextMark(g[k][i * n + j]), smart());
      return commit(g, before);
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'undo' && undo.length) { redo.push(load()); const g = undo.pop(); save(g); draw(); onChange(g); }
    else if (act === 'redo' && redo.length) { undo.push(load()); const g = redo.pop(); save(g); draw(); onChange(g); }
    else if (act === 'smart') {
      const on = !smart(); localStorage.setItem(smartKey, on ? 'on' : 'off');
      if (on) { const g = load(), before = JSON.parse(JSON.stringify(g)); propagate(g, n); commit(g, before); } else draw();
    }
    const clr = e.target.closest('[data-clear]');
    if (clr && !clr.disabled) {
      const kind = clr.dataset.clear;
      if (kind === 'all' && !confirm('Clear the whole grid? You can still undo this.')) return;
      clear(kind);
    }
  };
  // close the clear menu when clicking elsewhere
  if (root._gridOutside) document.removeEventListener('click', root._gridOutside);
  const outside = (e) => {
    if (!root.isConnected) return document.removeEventListener('click', outside);
    const m = root.querySelector('.gmenu[open]'); if (m && !m.contains(e.target)) m.open = false;
  };
  root._gridOutside = outside;
  document.addEventListener('click', outside);

  draw();
  return {
    redraw: draw,
    clear: () => clear('all'),
    setSolution: (s) => { solution = s; draw(); },
    destroy: () => document.removeEventListener('click', outside),
  };
}
