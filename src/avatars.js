const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/*
 * Cartoon-detective maker. An avatar is seven small numbers {b,s,h,e,m,a,o}.
 * Every value is a single digit so the database check (clean_avatar) accepts it.
 * Old avatars without "o" (outfit) still draw: they get the default outfit.
 */
export const OPTS = { b: 8, s: 6, h: 8, e: 6, m: 6, a: 10, o: 6 };
export const LABELS = { h: 'Hair', e: 'Eyes', m: 'Mouth', a: 'Gear', o: 'Outfit' };
const NAMES = {
  h: ['Bald', 'Short', 'Long', 'Curly', 'Spiky', 'Bun', 'Ponytail', 'Afro'],
  e: ['Dots', 'Big eyes', 'Happy', 'Wink', 'Suspicious', 'Shades'],
  m: ['Smile', 'Grin', 'Neutral', 'Surprised', 'Smirk', 'Gasp'],
  a: ['None', 'Detective cap', 'Glasses', 'Monocle', 'Moustache', 'Top hat', 'Fedora', 'Deerstalker', 'Bow tie', 'Magnifier'],
  o: ['T-shirt', 'Trench coat', 'Suit and tie', 'Turtleneck', 'Police uniform', 'Lab coat'],
};
const BG = ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#ffadad'];
const SKIN = ['#ffe0bd', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'];
const SHIRT = ['#2d6a4f', '#1d3557', '#7b2cbf', '#e76f51', '#264653', '#6d597a', '#bc4749', '#3a86ff'];
const HAIR = ['#2b2118', '#5a3825', '#b5651d', '#e0a800', '#c0392b', '#6c757d', '#e9e4d8', '#3a86ff'];

/** Ready-made looks for the "quick pick" row. */
export const PRESETS = [
  { name: 'Classic sleuth', cfg: { b: 0, s: 1, h: 1, e: 0, m: 4, a: 7, o: 1 } },
  { name: 'Noir agent', cfg: { b: 4, s: 3, h: 1, e: 5, m: 2, a: 6, o: 1 } },
  { name: 'Lab genius', cfg: { b: 2, s: 0, h: 3, e: 1, m: 1, a: 2, o: 5 } },
  { name: 'Beat cop', cfg: { b: 3, s: 4, h: 0, e: 4, m: 0, a: 4, o: 4 } },
  { name: 'High society', cfg: { b: 6, s: 2, h: 5, e: 2, m: 0, a: 3, o: 2 } },
];

export const DEFAULT_AVATAR = { b: 3, s: 1, h: 1, e: 0, m: 0, a: 1, o: 1 };
export const randomAvatar = () =>
  Object.fromEntries(Object.entries(OPTS).map(([k, n]) => [k, Math.floor(Math.random() * n)]));

const clamp = (v, n) => { v = Number.isInteger(+v) ? +v : 0; return ((v % n) + n) % n; };
export const sanitize = (c) => Object.fromEntries(Object.entries(OPTS).map(([k, n]) => [k, clamp(c?.[k] ?? DEFAULT_AVATAR[k], n)]));

/* Extra hats used only for generated suspects (never stored). */
const EXTRA_HATS = {
  chef: '<path d="M20 20Q14 8 24 7Q28 0 36 4Q46 2 46 12Q52 16 44 22Z" fill="#fff" stroke="#2a1a12" stroke-width="1.4"/><rect x="20" y="17" width="25" height="6" rx="1.5" fill="#fff" stroke="#2a1a12" stroke-width="1.4"/>',
  captain: '<path d="M16 22Q16 10 32 9Q48 10 48 22Z" fill="#fff" stroke="#2a1a12" stroke-width="1.4"/><path d="M14 22H50Q49 26 32 26Q15 26 14 22Z" fill="#1d3557"/><circle cx="32" cy="16" r="3" fill="#e0a800"/>',
  beret: '<ellipse cx="30" cy="17" rx="17" ry="7" fill="#c0392b"/><circle cx="31" cy="10" r="1.8" fill="#c0392b"/>',
  police: '<path d="M16 22Q16 9 32 9Q48 9 48 22Z" fill="#1d3557"/><path d="M13 22H51L49 26Q32 28 15 26Z" fill="#111"/><path d="M29 12L32 10L35 12L34 16H30Z" fill="#e0a800"/>',
  crown: '<path d="M19 19L19 8L25 14L32 5L39 14L45 8L45 19Z" fill="#e0a800" stroke="#7a5a00" stroke-width="1.2"/>',
  grad: '<path d="M12 15L32 7L52 15L32 22Z" fill="#222"/><rect x="24" y="16" width="16" height="6" fill="#222"/><path d="M48 15V24" stroke="#e0a800" stroke-width="1.6"/>',
};

function outfitSvg(o, shirt) {
  const ink = '#2a1a12';
  switch (o) {
    case 1: // trench coat with lapels
      return `<path d="M5 66Q8 46 32 46Q56 46 59 66Z" fill="#c8a165"/>
        <path d="M24 46L32 60L40 46" fill="${shirt}"/>
        <path d="M22 46L29 66M42 46L35 66" stroke="${ink}" stroke-width="1.2" opacity=".55"/>
        <path d="M20 47L30 58L24 63Z M44 47L34 58L40 63Z" fill="#a8824b"/>
        <circle cx="27" cy="62" r="1.2" fill="${ink}"/><circle cx="37" cy="62" r="1.2" fill="${ink}"/>`;
    case 2: // suit and tie
      return `<path d="M5 66Q8 46 32 46Q56 46 59 66Z" fill="#2b2d42"/>
        <path d="M25 46L32 56L39 46Z" fill="#fff"/><path d="M30.5 50L33.5 50L34.5 64L32 66L29.5 64Z" fill="#c0392b"/>
        <path d="M23 47L31 58M41 47L33 58" stroke="#11121c" stroke-width="1.6"/>`;
    case 3: // turtleneck
      return `<path d="M5 66Q8 46 32 46Q56 46 59 66Z" fill="${shirt}"/>
        <rect x="25" y="43" width="14" height="8" rx="3.5" fill="${shirt}" stroke="rgba(0,0,0,.25)" stroke-width="1"/>`;
    case 4: // police uniform
      return `<path d="M5 66Q8 46 32 46Q56 46 59 66Z" fill="#1d3557"/>
        <path d="M26 46L32 53L38 46" fill="#a0c4ff"/>
        <path d="M40 55L43 53L46 55L45.5 59L43 61L40.5 59Z" fill="#e0a800" stroke="#7a5a00" stroke-width=".8"/>`;
    case 5: // lab coat
      return `<path d="M5 66Q8 46 32 46Q56 46 59 66Z" fill="#f4f6f8" stroke="#cfd6dd" stroke-width="1"/>
        <path d="M26 46L32 56L38 46" fill="${shirt}"/>
        <path d="M32 56V66" stroke="#cfd6dd" stroke-width="1.2"/>
        <rect x="38" y="57" width="7" height="5" rx="1" fill="none" stroke="#cfd6dd" stroke-width="1"/><path d="M40 57V54" stroke="#3a86ff" stroke-width="1.4"/>`;
    default:
      return `<path d="M7 66Q9 47 32 47Q55 47 57 66Z" fill="${shirt}"/>`;
  }
}

/** cfg may also carry x (extra hat key) for generated suspects. */
export function avatarSvg(cfg, size = 40) {
  const c = sanitize(cfg);
  const extra = cfg && EXTRA_HATS[cfg.x] ? EXTRA_HATS[cfg.x] : '';
  const skin = SKIN[c.s], dark = '#2a1a12', hair = HAIR[(c.h * 3 + c.s) % 8];
  const stroke = `stroke="${dark}" stroke-width="1.8" stroke-linecap="round" fill="none"`;
  let back = '', front = '', hat = '', eyes = '', mouth = '', prop = '';

  // hair
  if (c.h === 2) back += `<path d="M15 31Q12 8 32 9Q52 8 49 31L51 52Q44 54 44 40L20 40Q20 54 13 52Z" fill="${hair}"/>`;
  if (c.h === 7) back += `<circle cx="32" cy="22" r="20" fill="${hair}"/>`;
  const cap = `<path d="M17 29Q16 12 32 12Q48 12 47 29Q41 20 32 20Q23 20 17 29Z" fill="${hair}"/>`;
  if ([1, 2, 5, 6].includes(c.h)) front += cap;
  if (c.h === 3) front += [[20, 19, 7], [28, 14, 7], [36, 14, 7], [44, 19, 7], [17, 28, 5], [47, 28, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${hair}"/>`).join('');
  if (c.h === 4) front += `<path d="M17 28L18 10L25 18L29 5L35 18L41 7L44 19L47 28Q40 19 32 19Q24 19 17 28Z" fill="${hair}"/>`;
  if (c.h === 5) front += `<circle cx="32" cy="9" r="6" fill="${hair}"/>`;
  if (c.h === 6) front += `<path d="M46 21Q60 22 55 43Q50 33 46 30Z" fill="${hair}"/>`;
  if (c.h === 7) front += `<path d="M18 26Q32 14 46 26Q40 20 32 20Q24 20 18 26Z" fill="${hair}"/>`;

  // eyes
  const L = 26, R = 38, Y = 30;
  eyes = [
    `<circle cx="${L}" cy="${Y}" r="1.9" fill="${dark}"/><circle cx="${R}" cy="${Y}" r="1.9" fill="${dark}"/>`,
    `<circle cx="${L}" cy="${Y}" r="4.2" fill="#fff" stroke="${dark}" stroke-width="1"/><circle cx="${R}" cy="${Y}" r="4.2" fill="#fff" stroke="${dark}" stroke-width="1"/><circle cx="${L + 1}" cy="${Y}" r="2" fill="${dark}"/><circle cx="${R + 1}" cy="${Y}" r="2" fill="${dark}"/>`,
    `<path d="M23 31Q26 26.5 29 31M35 31Q38 26.5 41 31" ${stroke}/>`,
    `<circle cx="${L}" cy="${Y}" r="1.9" fill="${dark}"/><path d="M35 31Q38 26.5 41 31" ${stroke}/>`,
    `<circle cx="${L}" cy="${Y + 1}" r="2" fill="${dark}"/><circle cx="${R}" cy="${Y + 1}" r="2" fill="${dark}"/><path d="M22 27L30 29M34 29L42 27" ${stroke}/>`,
    `<path d="M19.5 27.5H44.5L43 33Q38.5 35.5 34.5 32.5L32 30.5L29.5 32.5Q25.5 35.5 21 33Z" fill="#14161c"/><path d="M23 29L26 29" stroke="#fff" stroke-width="1.2" opacity=".6"/>`,
  ][c.e];

  // mouth
  mouth = [
    `<path d="M26 39Q32 45.5 38 39" ${stroke}/>`,
    `<path d="M25 38Q32 49 39 38Z" fill="#7a1f1f" stroke="${dark}" stroke-width="1.4" stroke-linejoin="round"/><path d="M27 39.2Q32 41 37 39.2" stroke="#fff" stroke-width="2" fill="none"/>`,
    `<path d="M27 41H37" ${stroke}/>`,
    `<ellipse cx="32" cy="41.5" rx="3" ry="3.6" fill="#7a1f1f" stroke="${dark}" stroke-width="1.3"/>`,
    `<path d="M27 41.5Q33 42.5 38 38.5" ${stroke}/>`,
    `<path d="M27 43Q32 35 37 43Z" fill="#7a1f1f" stroke="${dark}" stroke-width="1.3" stroke-linejoin="round"/>`,
  ][c.m];

  // accessories
  if (c.a === 1) hat = `<path d="M16 25Q15 7 32 7Q49 7 48 25Z" fill="#8b6b3e"/><path d="M16 25L48 25L51 28.5Q32 33 13 28.5Z" fill="#6f5430"/><circle cx="32" cy="7" r="2.3" fill="#6f5430"/><path d="M24 14L40 14M22 19L42 19" stroke="#a88650" stroke-width="1.4"/>`;
  if (c.a === 2) hat = `<circle cx="${L}" cy="${Y}" r="5.8" fill="rgba(255,255,255,.25)" stroke="#222" stroke-width="1.6"/><circle cx="${R}" cy="${Y}" r="5.8" fill="rgba(255,255,255,.25)" stroke="#222" stroke-width="1.6"/><path d="M31.8 30H32.2" stroke="#222" stroke-width="1.6"/>`;
  if (c.a === 3) hat = `<circle cx="${R}" cy="${Y}" r="6.3" fill="rgba(255,255,255,.3)" stroke="#d4a017" stroke-width="1.8"/><path d="M44 33Q49 45 44 52" stroke="#d4a017" stroke-width="1" fill="none"/>`;
  if (c.a === 4) hat = `<path d="M23 38Q28 33 32 36.5Q36 33 41 38Q36 41.5 32 39Q28 41.5 23 38Z" fill="${c.h === 0 ? '#2b2118' : hair}"/>`;
  if (c.a === 5) hat = `<ellipse cx="32" cy="20" rx="18" ry="3.6" fill="#222"/><rect x="20" y="3" width="24" height="17" rx="2" fill="#222"/><rect x="20" y="14" width="24" height="3.6" fill="#c0392b"/>`;
  if (c.a === 6) hat = `<ellipse cx="32" cy="21" rx="21" ry="4.5" fill="#3b3b46"/><path d="M19 21Q19 7 32 7Q45 7 45 21Z" fill="#4a4a57"/><path d="M26 9Q32 13 38 9" stroke="#33333d" stroke-width="2" fill="none"/><rect x="19" y="16" width="26" height="3.5" fill="#111"/>`;
  if (c.a === 7) hat = `<path d="M15 24Q14 7 32 7Q50 7 49 24Z" fill="#b08d57"/><path d="M15 24Q32 30 49 24L52 27Q32 34 12 27Z" fill="#8f6f3e"/>
      <path d="M20 12L44 12M18 18L46 18M26 8L24 24M38 8L40 24" stroke="#7d5f33" stroke-width="1" opacity=".7"/><path d="M14 22Q8 26 12 32Q16 28 17 24Z" fill="#8f6f3e"/><path d="M50 22Q56 26 52 32Q48 28 47 24Z" fill="#8f6f3e"/><circle cx="32" cy="7" r="2" fill="#7d5f33"/>`;
  if (c.a === 8) prop = `<path d="M24 47L31 50L24 54Z M40 47L33 50L40 54Z" fill="#c0392b" stroke="#7a1f1f" stroke-width=".9"/><rect x="30" y="48.3" width="4" height="3.6" rx="1" fill="#a93226"/>`;
  if (c.a === 9) prop = `<path d="M47 52L56 63" stroke="#6f5430" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="48" r="7" fill="rgba(160,220,255,.45)" stroke="#d4a017" stroke-width="2.4"/><path d="M40.5 45.5Q42 43.5 44.5 43.5" stroke="#fff" stroke-width="1.4" fill="none"/>`;
  if (extra) hat = extra;

  return `<svg class="avsvg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Cartoon avatar">
    <rect width="64" height="64" fill="${BG[c.b]}"/>
    ${back}
    ${outfitSvg(c.o, SHIRT[c.b])}
    <rect x="27.5" y="38" width="9" height="${c.o === 3 ? 6 : 10}" rx="3" fill="${skin}"/>
    ${c.o === 3 ? `<rect x="25" y="43" width="14" height="8" rx="3.5" fill="${SHIRT[c.b]}"/>` : ''}
    <circle cx="17" cy="32" r="3.2" fill="${skin}"/><circle cx="47" cy="32" r="3.2" fill="${skin}"/>
    <ellipse cx="32" cy="30" rx="15" ry="17" fill="${skin}"/>
    ${front}
    <circle cx="21.5" cy="37" r="2.8" fill="#ff7a8a" opacity=".3"/><circle cx="42.5" cy="37" r="2.8" fill="#ff7a8a" opacity=".3"/>
    ${eyes}
    <path d="M32 32Q34.2 35 31.2 36" stroke="${dark}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".6"/>
    ${mouth}
    ${hat}${prop}
  </svg>`;
}

/* ---------- generated suspects ---------- */
function hash(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const ROLE_HINTS = [
  [/\bchef|baker|cook\b/i, { x: 'chef', o: 5 }],
  [/\bcaptain|sailor|fisherman|admiral\b/i, { x: 'captain', o: 2 }],
  [/\bguard|officer|inspector|constable|sheriff|arbiter\b/i, { x: 'police', o: 4 }],
  [/\bdirector|artist|sculptor|painter|make-?up|restorer\b/i, { x: 'beret', o: 3 }],
  [/\blady|madam|countess|queen|duchess\b/i, { x: 'crown', h: 5, o: 2 }],
  [/\bprofessor|dr\.?|doctor|scientist|engineer|student|librarian\b/i, { a: 2, o: 5 }],
  [/\bgrandmaster|founder|investor|curator\b/i, { a: 3, o: 2 }],
  [/\bbutler|vicar|conductor\b/i, { a: 8, o: 2 }],
  [/\bmagician\b/i, { a: 5, o: 2 }],
  [/\bgardener|janitor|stagehand|driver|groundskeeper\b/i, { o: 3, a: 1 }],
];

/** A stable cartoon face for a suspect, picked from their name (and role words like "Chef" or "Captain"). */
export function suspectCfg(name) {
  const h = hash(name);
  const pick = (n, shift) => (h >>> shift) % n;
  const cfg = { b: pick(8, 0), s: pick(6, 3), h: pick(8, 6), e: [0, 1, 4, 3, 5][pick(5, 9)], m: [2, 4, 0, 5][pick(4, 12)], a: [0, 4, 3, 6, 0][pick(5, 15)], o: pick(6, 18) };
  for (const [re, over] of ROLE_HINTS) if (re.test(name)) { Object.assign(cfg, over); break; }
  return cfg;
}
export const suspectSvg = (name, size = 64) => avatarSvg(suspectCfg(name), size);

/**
 * Renders an avatar maker into `root`.
 * onChange(cfg) fires on every edit. Returns { get(), set(cfg) }.
 * compact: a small preview with a "Customise" toggle (used when joining).
 */
export function mountAvatarPicker(root, initial, onChange = () => {}, { compact = false } = {}) {
  let cfg = sanitize(initial || DEFAULT_AVATAR);
  let open = !compact;
  const dots = (key, colors, label) => `<div class="pk-row"><span class="pk-l">${label}</span><div class="pk-dots" role="radiogroup" aria-label="${label}">
    ${colors.map((col, i) => `<button type="button" class="pk-dot${cfg[key] === i ? ' on' : ''}" style="background:${col}" data-k="${key}" data-v="${i}" role="radio" aria-checked="${cfg[key] === i}" aria-label="${label} ${i + 1}"></button>`).join('')}</div></div>`;
  const cyc = (key) => `<div class="pk-row"><span class="pk-l">${LABELS[key]}</span>
    <button type="button" class="btn sm sec pk-b" data-k="${key}" data-d="-1" aria-label="Previous ${LABELS[key].toLowerCase()}">‹</button>
    <span class="pk-v">${esc(NAMES[key][cfg[key]])}</span>
    <button type="button" class="btn sm sec pk-b" data-k="${key}" data-d="1" aria-label="Next ${LABELS[key].toLowerCase()}">›</button></div>`;

  function draw() {
    root.innerHTML = `<div class="picker${open ? '' : ' closed'}">
      <div class="pk-prev"><div class="pk-face">${avatarSvg(cfg, 120)}</div>
        <div class="pk-acts"><button type="button" class="btn sm sec" data-rand>🎲 Shuffle</button>
        ${compact ? `<button type="button" class="btn sm ghost" data-open aria-expanded="${open}">${open ? 'Done' : '✏️ Customise'}</button>` : ''}</div></div>
      <div class="pk-side">
        <div class="pk-presets" aria-label="Quick looks">${PRESETS.map((p, i) => `<button type="button" class="pk-pre" data-pre="${i}" title="${esc(p.name)}" aria-label="${esc(p.name)}">${avatarSvg(p.cfg, 40)}</button>`).join('')}</div>
        ${open ? `<div class="pk-opts">${dots('b', BG, 'Backdrop')}${dots('s', SKIN, 'Skin')}${cyc('h')}${cyc('e')}${cyc('m')}${cyc('a')}${cyc('o')}</div>`
          : '<p class="pk-tip">Pick a quick look or tap Customise to build your own detective.</p>'}
      </div></div>`;
  }
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    if (t.hasAttribute('data-rand')) cfg = randomAvatar();
    else if (t.hasAttribute('data-open')) { open = !open; draw(); return; }
    else if (t.dataset.pre) cfg = { ...PRESETS[+t.dataset.pre].cfg };
    else if (t.dataset.k && t.dataset.d) cfg[t.dataset.k] = clamp(cfg[t.dataset.k] + +t.dataset.d, OPTS[t.dataset.k]);
    else if (t.dataset.k && t.dataset.v) cfg[t.dataset.k] = +t.dataset.v;
    else return;
    draw(); onChange({ ...cfg });
  });
  draw();
  return { get: () => ({ ...cfg }), set: (c) => { cfg = sanitize(c); draw(); } };
}
