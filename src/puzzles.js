import { sb } from './supabase.js';
import { icon } from './ui.js';
import { suspectSvg } from './avatars.js';
import { weaponIcon, placeIcon } from './themes.js';

const isStr = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;

/** Returns '' if valid, otherwise a human-readable problem. */
export function validatePuzzle(p, i = 0) {
  const w = `Puzzle ${i + 1}: `;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return w + 'must be an object.';
  if (!isStr(p.id, 60) || !isStr(p.title, 100)) return w + 'needs a short "id" and a "title".';
  if (!isStr(p.story, 1500)) return w + 'needs a "story" (max 1500 characters).';
  for (const k of ['suspects', 'weapons', 'locations']) {
    const a = p[k];
    if (!Array.isArray(a) || a.length !== 3) return w + `"${k}" must contain exactly 3 entries (the grid is 3×3).`;
    if (a.some((x) => !x || !isStr(x.name, 60))) return w + `every entry in "${k}" needs a "name".`;
    const names = a.map((x) => x.name.trim().toLowerCase());
    if (new Set(names).size !== 3) return w + `names in "${k}" must be different from each other.`;
  }
  if (!Array.isArray(p.clues) || p.clues.length < 1 || p.clues.length > 10 || p.clues.some((c) => !isStr(c, 400))) {
    return w + '"clues" must be a list of 1–10 text clues.';
  }
  const s = p.solution || {};
  if (!p.suspects.some((x) => x.name === s.suspect) || !p.weapons.some((x) => x.name === s.weapon) ||
      !p.locations.some((x) => x.name === s.location)) {
    return w + '"solution" must use names exactly as written in suspects, weapons and locations.';
  }
  return '';
}

/** Parse pasted/uploaded JSON, validate all, then save. Throws with a clear message on any problem. */
export async function importPuzzles(text, ownerId) {
  let arr;
  try { arr = JSON.parse(text); } catch (e) { throw new Error('That is not valid JSON: ' + e.message); }
  if (!Array.isArray(arr)) arr = [arr];
  if (!arr.length) throw new Error('No puzzles found in that JSON.');
  for (let i = 0; i < arr.length; i++) { const er = validatePuzzle(arr[i], i); if (er) throw new Error(er); }
  const ids = arr.map((p) => p.id);
  if (new Set(ids).size !== ids.length) throw new Error('Two puzzles share the same "id". Each id must be unique.');
  const rows = arr.map((p) => ({
    owner_id: ownerId,
    slug: p.id,
    title: p.title.trim(),
    content: { story: p.story, suspects: p.suspects, weapons: p.weapons, locations: p.locations, clues: p.clues },
    solution: p.solution,
    explanation: p.explanation || null,
  }));
  const { error } = await sb.from('puzzles').upsert(rows, { onConflict: 'owner_id,slug' });
  if (error) throw new Error(error.message);
  return rows.length;
}

/**
 * Case-file body: the story on a typed report, a suspect line-up with cartoon mugshots,
 * evidence tags for weapons and locations, and numbered clue slips.
 * `ruled` is a set of names struck out by detective hints.
 */
export function caseHtml(c, esc, ruled = new Set()) {
  const r = (n) => (ruled.has(n) ? ' ruled' : '');
  const suspects = c.suspects.map((s, i) => `<figure class="mug${r(s.name)}">
      <div class="mug-pic"><div class="mug-h" aria-hidden="true"></div>${suspectSvg(s.name, 96)}<span class="mug-no">#${String(i + 1).padStart(2, '0')}</span></div>
      <figcaption><b>${esc(s.name)}</b><span>${esc(s.trait || '')}</span></figcaption></figure>`).join('');
  const tag = (x, ic) => `<div class="tag${r(x.name)}"><span class="tag-ic" aria-hidden="true">${ic(x.name)}</span>
      <div><b>${esc(x.name)}</b><span>${esc(x.description || '')}</span></div></div>`;
  return `<div class="dossier"><p class="story">${esc(c.story)}</p></div>
    <h4 class="sec-h">${icon('user', 15)} The line-up</h4><div class="lineup">${suspects}</div>
    <div class="evid"><div><h4 class="sec-h">${icon('weapon', 15)} Possible weapons</h4>${c.weapons.map((w) => tag(w, weaponIcon)).join('')}</div>
      <div><h4 class="sec-h">${icon('pin', 15)} Possible scenes</h4>${c.locations.map((l) => tag(l, placeIcon)).join('')}</div></div>
    <h4 class="sec-h">${icon('search', 15)} Clues</h4><ol class="clues">${c.clues.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol>`;
}
