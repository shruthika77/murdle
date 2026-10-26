const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* A tiny cartoon-detective maker. An avatar is just six small numbers: {b,s,h,e,m,a}. */
export const OPTS = { b: 8, s: 6, h: 8, e: 5, m: 5, a: 6 };
export const LABELS = { h: 'Hair', e: 'Eyes', m: 'Mouth', a: 'Accessory' };
const NAMES = {
  h: ['Bald', 'Short', 'Long', 'Curly', 'Spiky', 'Bun', 'Ponytail', 'Afro'],
  e: ['Dots', 'Big eyes', 'Happy', 'Wink', 'Suspicious'],
  m: ['Smile', 'Grin', 'Neutral', 'Surprised', 'Smirk'],
  a: ['None', 'Detective cap', 'Glasses', 'Monocle', 'Moustache', 'Top hat'],
};
const BG = ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#ffadad'];
const SKIN = ['#ffe0bd', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'];
const SHIRT = ['#2d6a4f', '#1d3557', '#7b2cbf', '#e76f51', '#264653', '#6d597a', '#bc4749', '#3a86ff'];
const HAIR = ['#2b2118', '#5a3825', '#b5651d', '#e0a800', '#c0392b', '#6c757d', '#e9e4d8', '#3a86ff'];

export const DEFAULT_AVATAR = { b: 3, s: 1, h: 1, e: 0, m: 0, a: 1 };
export const randomAvatar = () =>
  Object.fromEntries(Object.entries(OPTS).map(([k, n]) => [k, Math.floor(Math.random() * n)]));

const clamp = (v, n) => { v = Number.isInteger(+v) ? +v : 0; return ((v % n) + n) % n; };
export const sanitize = (c) => Object.fromEntries(Object.entries(OPTS).map(([k, n]) => [k, clamp(c?.[k] ?? DEFAULT_AVATAR[k], n)]));

export function avatarSvg(cfg, size = 40) {
  const c = sanitize(cfg);
  const skin = SKIN[c.s], dark = '#2a1a12', hair = HAIR[(c.h * 3 + c.s) % 8];
  const stroke = `stroke="${dark}" stroke-width="1.8" stroke-linecap="round" fill="none"`;
  let back = '', front = '', hat = '', eyes = '', mouth = '';

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
  ][c.e];

  // mouth
  mouth = [
    `<path d="M26 39Q32 45.5 38 39" ${stroke}/>`,
    `<path d="M25 38Q32 49 39 38Z" fill="#7a1f1f" stroke="${dark}" stroke-width="1.4" stroke-linejoin="round"/><path d="M27 39.2Q32 41 37 39.2" stroke="#fff" stroke-width="2" fill="none"/>`,
    `<path d="M27 41H37" ${stroke}/>`,
    `<ellipse cx="32" cy="41.5" rx="3" ry="3.6" fill="#7a1f1f" stroke="${dark}" stroke-width="1.3"/>`,
    `<path d="M27 41.5Q33 42.5 38 38.5" ${stroke}/>`,
  ][c.m];

  // accessories
  if (c.a === 1) hat = `<path d="M16 25Q15 7 32 7Q49 7 48 25Z" fill="#8b6b3e"/><path d="M16 25L48 25L51 28.5Q32 33 13 28.5Z" fill="#6f5430"/><circle cx="32" cy="7" r="2.3" fill="#6f5430"/><path d="M24 14L40 14M22 19L42 19" stroke="#a88650" stroke-width="1.4"/>`;
  if (c.a === 2) hat = `<circle cx="${L}" cy="${Y}" r="5.8" fill="rgba(255,255,255,.25)" stroke="#222" stroke-width="1.6"/><circle cx="${R}" cy="${Y}" r="5.8" fill="rgba(255,255,255,.25)" stroke="#222" stroke-width="1.6"/><path d="M31.8 30H32.2" stroke="#222" stroke-width="1.6"/>`;
  if (c.a === 3) hat = `<circle cx="${R}" cy="${Y}" r="6.3" fill="rgba(255,255,255,.3)" stroke="#d4a017" stroke-width="1.8"/><path d="M44 33Q49 45 44 52" stroke="#d4a017" stroke-width="1" fill="none"/>`;
  if (c.a === 4) hat = `<path d="M23 38Q28 33 32 36.5Q36 33 41 38Q36 41.5 32 39Q28 41.5 23 38Z" fill="${c.h === 0 ? '#2b2118' : hair}"/>`;
  if (c.a === 5) hat = `<ellipse cx="32" cy="20" rx="18" ry="3.6" fill="#222"/><rect x="20" y="3" width="24" height="17" rx="2" fill="#222"/><rect x="20" y="14" width="24" height="3.6" fill="#c0392b"/>`;

  return `<svg class="avsvg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Cartoon avatar">
    <rect width="64" height="64" fill="${BG[c.b]}"/>
    ${back}
    <path d="M7 66Q9 47 32 47Q55 47 57 66Z" fill="${SHIRT[c.b]}"/>
    <rect x="27.5" y="38" width="9" height="11" rx="3" fill="${skin}"/>
    <circle cx="17" cy="32" r="3.2" fill="${skin}"/><circle cx="47" cy="32" r="3.2" fill="${skin}"/>
    <ellipse cx="32" cy="30" rx="15" ry="17" fill="${skin}"/>
    ${front}
    <circle cx="21.5" cy="37" r="2.8" fill="#ff7a8a" opacity=".3"/><circle cx="42.5" cy="37" r="2.8" fill="#ff7a8a" opacity=".3"/>
    ${eyes}
    <path d="M32 32Q34.2 35 31.2 36" stroke="${dark}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".6"/>
    ${mouth}
    ${hat}
  </svg>`;
}

/**
 * Renders an avatar maker into `root`.
 * onChange(cfg) fires on every edit. Returns { get(), set(cfg) }.
 */
export function mountAvatarPicker(root, initial, onChange = () => {}) {
  let cfg = sanitize(initial || DEFAULT_AVATAR);
  const dots = (key, colors, label) => `<div class="pk-row"><span class="pk-l">${label}</span><div class="pk-dots" role="radiogroup" aria-label="${label}">
    ${colors.map((col, i) => `<button type="button" class="pk-dot${cfg[key] === i ? ' on' : ''}" style="background:${col}" data-k="${key}" data-v="${i}" role="radio" aria-checked="${cfg[key] === i}" aria-label="${label} ${i + 1}"></button>`).join('')}</div></div>`;
  const cyc = (key) => `<div class="pk-row"><span class="pk-l">${LABELS[key]}</span>
    <button type="button" class="btn sm sec pk-b" data-k="${key}" data-d="-1" aria-label="Previous ${LABELS[key].toLowerCase()}">‹</button>
    <span class="pk-v">${esc(NAMES[key][cfg[key]])}</span>
    <button type="button" class="btn sm sec pk-b" data-k="${key}" data-d="1" aria-label="Next ${LABELS[key].toLowerCase()}">›</button></div>`;

  function draw() {
    root.innerHTML = `<div class="picker"><div class="pk-prev"><div class="pk-face">${avatarSvg(cfg, 120)}</div>
      <button type="button" class="btn sm sec" data-rand>🎲 Surprise me</button></div>
      <div class="pk-opts">${dots('b', BG, 'Background')}${dots('s', SKIN, 'Skin')}${cyc('h')}${cyc('e')}${cyc('m')}${cyc('a')}</div></div>`;
  }
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-rand')) cfg = randomAvatar();
    else if (t.dataset.k && t.dataset.d) cfg[t.dataset.k] = clamp(cfg[t.dataset.k] + +t.dataset.d, OPTS[t.dataset.k]);
    else if (t.dataset.k && t.dataset.v) cfg[t.dataset.k] = +t.dataset.v;
    else return;
    draw(); onChange({ ...cfg });
  });
  draw();
  return { get: () => ({ ...cfg }), set: (c) => { cfg = sanitize(c); draw(); } };
}
