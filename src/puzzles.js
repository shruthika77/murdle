import { sb } from './supabase.js';
import { icon } from './ui.js';

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

/** Case-file body: story, suspects / weapons / locations and clues. */
export function caseHtml(c, esc) {
  const col = (label, ic, list) => `<div><h4>${icon(ic, 14)} ${label}</h4>${list.map((s) =>
    `<div class="ent"><b>${esc(s.name)}</b><span>${esc(s.trait || s.description || '')}</span></div>`).join('')}</div>`;
  return `<p class="story">${esc(c.story)}</p>
    <div class="trio">${col('Suspects', 'user', c.suspects)}${col('Weapons', 'weapon', c.weapons)}${col('Locations', 'pin', c.locations)}</div>
    <h3 class="mt" style="margin-bottom:6px">Clues</h3><ol class="clues">${c.clues.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol>`;
}
