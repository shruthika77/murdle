/*
 * Case themes: every round gets a cartoon scene that matches its story (manor, harbour, stage, …).
 * The theme also tints the case file and the projector, so each level looks different.
 */
const INK = '#141a2e';
const stars = (n, seed, w = 800, h = 90) => {
  let s = seed, out = '';
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280; const x = (s / 233280) * w;
    s = (s * 9301 + 49297) % 233280; const y = 8 + (s / 233280) * h;
    out += `<circle class="tw" style="animation-delay:${(i % 7) * 0.4}s" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${i % 3 ? 1.3 : 2}" fill="#fff8d6"/>`;
  }
  return out;
};
const moon = (x, y, r = 26) => `<circle cx="${x}" cy="${y}" r="${r + 16}" fill="#fff3b0" opacity=".12"/><circle cx="${x}" cy="${y}" r="${r}" fill="#fff3b0" stroke="${INK}" stroke-width="3"/><circle cx="${x - 8}" cy="${y - 5}" r="5" fill="#f1dd86"/><circle cx="${x + 7}" cy="${y + 8}" r="3.5" fill="#f1dd86"/>`;
const win = (x, y, w = 14, h = 18, lit = true) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${lit ? '#ffcf8a' : '#2a3352'}" stroke="${INK}" stroke-width="2.5"/>`;
const ground = (col) => `<path d="M0 200V172Q200 158 400 170T800 166V200Z" fill="${col}" stroke="${INK}" stroke-width="3"/>`;

const SCENES = {
  manor: (a) => `${stars(26, 3)}${moon(660, 52)}
    <path d="M90 172V96L170 50L250 96V172Z" fill="#3b2f5c" stroke="${INK}" stroke-width="3"/>
    <path d="M250 172V70H420V172Z" fill="#46386b" stroke="${INK}" stroke-width="3"/>
    <path d="M240 72L335 22L430 72Z" fill="#2c2347" stroke="${INK}" stroke-width="3"/>
    <rect x="380" y="28" width="16" height="30" fill="#2c2347" stroke="${INK}" stroke-width="3"/>
    ${win(120, 104)}${win(196, 104, 14, 18, false)}${win(275, 92)}${win(310, 92, 14, 18, false)}${win(345, 92)}${win(380, 92)}
    <path d="M318 172V136Q335 120 352 136V172Z" fill="#1d1630" stroke="${INK}" stroke-width="3"/>
    ${win(275, 132, 14, 18, false)}${win(380, 132)}
    <path d="M500 172V120Q520 70 540 120V172M560 172V132Q575 96 590 132V172" fill="#1f3b2d" stroke="${INK}" stroke-width="3"/>
    <path d="M90 172Q76 120 60 172Z" fill="#1f3b2d" stroke="${INK}" stroke-width="3"/>
    ${ground(a)}
    <g class="bat"><path d="M600 110q8-8 14 0q6-8 14 0q-7 2-14 8q-7-6-14-8z" fill="${INK}"/></g>`,
  harbour: (a) => `${stars(22, 7)}${moon(140, 50, 22)}
    <path d="M560 175L585 60H625L650 175Z" fill="#f6f1e7" stroke="${INK}" stroke-width="3"/>
    <path d="M572 120H638M566 150H644M578 92H632" stroke="#e2384d" stroke-width="10"/>
    <path d="M560 175L585 60H625L650 175Z" fill="none" stroke="${INK}" stroke-width="3"/>
    <rect x="578" y="36" width="54" height="26" rx="4" fill="#ffcf8a" stroke="${INK}" stroke-width="3"/>
    <path d="M572 36L605 14L638 36Z" fill="#e2384d" stroke="${INK}" stroke-width="3"/>
    <path class="beam" d="M632 48L800 10V86Z" fill="#fff3b0" opacity=".25"/>
    <path d="M150 168L170 140H330L350 168Z" fill="#e2384d" stroke="${INK}" stroke-width="3"/>
    <path d="M240 140V80L300 136Z" fill="#f6f1e7" stroke="${INK}" stroke-width="3"/><path d="M240 80V140" stroke="${INK}" stroke-width="3"/>
    <path class="wave" d="M0 178Q25 166 50 178T100 178T150 178T200 178T250 178T300 178T350 178T400 178T450 178T500 178T550 178T600 178T650 178T700 178T750 178T800 178T850 178V200H0Z" fill="#2f6fa8" stroke="${INK}" stroke-width="3"/>`,
  stage: (a) => `<rect width="800" height="200" fill="#2b0f1e"/>
    <path class="spot" d="M400 0L270 172H530Z" fill="#fff3b0" opacity=".18"/>
    <path d="M0 0H170Q150 60 175 110Q140 150 165 200H0Z" fill="#b3203a" stroke="${INK}" stroke-width="3"/>
    <path d="M800 0H630Q650 60 625 110Q660 150 635 200H800Z" fill="#b3203a" stroke="${INK}" stroke-width="3"/>
    <path d="M40 0V200M90 0V200M710 0V200M760 0V200" stroke="#8a1730" stroke-width="5"/>
    <path d="M0 0H800V26Q700 46 600 26Q500 46 400 26Q300 46 200 26Q100 46 0 26Z" fill="#d93a52" stroke="${INK}" stroke-width="3"/>
    <rect x="0" y="168" width="800" height="32" fill="#6b3a1e" stroke="${INK}" stroke-width="3"/>
    <path d="M370 168V128Q400 104 430 128V168Z" fill="#ffcf8a" stroke="${INK}" stroke-width="3"/>
    <circle cx="390" cy="138" r="4" fill="${INK}"/><circle cx="410" cy="138" r="4" fill="${INK}"/><path d="M388 152Q400 160 412 152" stroke="${INK}" stroke-width="3" fill="none"/>
    <path d="M440 168V132Q470 108 500 132V168Z" fill="#f6f1e7" stroke="${INK}" stroke-width="3"/>
    <circle cx="460" cy="142" r="4" fill="${INK}"/><circle cx="480" cy="142" r="4" fill="${INK}"/><path d="M458 160Q470 150 482 160" stroke="${INK}" stroke-width="3" fill="none"/>`,
  museum: (a) => `${stars(16, 11)}${moon(700, 46, 20)}
    <path d="M200 74L400 20L600 74Z" fill="#e8dcc0" stroke="${INK}" stroke-width="3"/>
    <rect x="210" y="74" width="380" height="14" fill="#d8caa8" stroke="${INK}" stroke-width="3"/>
    ${[240, 300, 360, 420, 480, 540].map((x) => `<rect x="${x}" y="88" width="22" height="78" fill="#f2ead6" stroke="${INK}" stroke-width="3"/>`).join('')}
    <rect x="196" y="166" width="408" height="10" fill="#d8caa8" stroke="${INK}" stroke-width="3"/>
    <path d="M388 50L400 40L412 50L400 62Z" fill="#3ec5b7" stroke="${INK}" stroke-width="2.5"/>
    <path d="M60 172L100 110L140 172Z" fill="#e0b04c" stroke="${INK}" stroke-width="3"/>
    <path d="M680 172V140H730V172" fill="#3ec5b7" stroke="${INK}" stroke-width="3"/><circle cx="705" cy="128" r="12" fill="#ffcf8a" stroke="${INK}" stroke-width="3"/>
    ${ground(a)}`,
  kitchen: (a) => `<rect width="800" height="200" fill="#2a2140"/>
    ${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 40}" y="${i % 2 ? 0 : 20}" width="40" height="20" fill="#332954"/>`).join('')}
    <rect x="80" y="40" width="160" height="90" rx="6" fill="#4ea3d8" stroke="${INK}" stroke-width="3"/><path d="M160 40V130M80 85H240" stroke="${INK}" stroke-width="3"/>
    ${moon(120, 64, 12)}
    <rect x="0" y="140" width="800" height="60" fill="#c88a4a" stroke="${INK}" stroke-width="3"/><rect x="0" y="134" width="800" height="12" fill="#e7b16f" stroke="${INK}" stroke-width="3"/>
    <path d="M380 134V102H470V134" fill="#5d6877" stroke="${INK}" stroke-width="3"/><path d="M370 104H480" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path class="steam" d="M410 92Q400 76 412 62T406 34M440 92Q430 76 442 62T436 34" stroke="#f6f1e7" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M560 134Q560 92 610 92Q660 92 660 134Z" fill="#f6d8a8" stroke="${INK}" stroke-width="3"/><path d="M580 118H640" stroke="#e2384d" stroke-width="5"/>
    <circle cx="610" cy="88" r="7" fill="#e2384d" stroke="${INK}" stroke-width="2.5"/>
    <path d="M700 40V120M690 40H710M300 30V90" stroke="#a5adbd" stroke-width="4"/><path d="M285 90Q300 110 315 90Z" fill="#a5adbd" stroke="${INK}" stroke-width="2.5"/>`,
  office: (a) => `${stars(18, 19)}
    ${[[40, 70, 90], [140, 40, 70], [220, 90, 80], [560, 50, 90], [660, 80, 70], [740, 30, 60]].map(([x, y, w]) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${200 - y}" fill="#2a3557" stroke="${INK}" stroke-width="3"/>${Array.from({ length: 4 }, (_, i) => win(x + 10 + (i % 2) * (w / 2), y + 14 + Math.floor(i / 2) * 28, 14, 16, (x + i) % 3 !== 0)).join('')}`).join('')}
    <rect x="320" y="30" width="180" height="170" fill="#334170" stroke="${INK}" stroke-width="3"/>
    <rect x="340" y="50" width="140" height="80" rx="6" fill="#3ec5b7" stroke="${INK}" stroke-width="3"/>
    <path d="M356 70H420M356 86H460M356 102H430" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <circle class="blink" cx="470" cy="66" r="5" fill="#e2384d"/>
    ${ground(a)}`,
  garden: (a) => `<rect width="800" height="200" fill="#20304a"/>${stars(14, 23)}${moon(90, 46, 20)}
    <path d="M520 172V110Q520 70 580 70Q640 70 640 110V172Z" fill="rgba(158,233,220,.35)" stroke="${INK}" stroke-width="3"/>
    <path d="M580 70V172M520 118H640M550 76V172M610 76V172" stroke="${INK}" stroke-width="2"/>
    <circle cx="240" cy="110" r="44" fill="#3f8f4f" stroke="${INK}" stroke-width="3"/><circle cx="200" cy="130" r="34" fill="#4ea85e" stroke="${INK}" stroke-width="3"/>
    <rect x="232" y="140" width="16" height="34" fill="#7a4e2a" stroke="${INK}" stroke-width="3"/>
    ${[[330, 160], [360, 150], [390, 162], [700, 158], [730, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#e2384d" stroke="${INK}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="3" fill="#ffcf8a"/>`).join('')}
    <path d="M420 172V146Q430 130 440 146V172Z" fill="#c9b79c" stroke="${INK}" stroke-width="3"/><circle cx="430" cy="128" r="9" fill="#e2384d" stroke="${INK}" stroke-width="2.5"/>
    ${ground(a)}`,
  city: (a) => `${stars(30, 29)}${moon(130, 52)}
    ${[[260, 60, 70], [340, 90, 60], [410, 40, 80], [500, 80, 60], [570, 50, 90], [670, 100, 60], [740, 70, 60]].map(([x, y, w]) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${200 - y}" fill="#232b48" stroke="${INK}" stroke-width="3"/>${Array.from({ length: 6 }, (_, i) => win(x + 8 + (i % 2) * (w / 2 - 2), y + 12 + Math.floor(i / 2) * 26, 12, 14, (x + i * 7) % 5 < 3)).join('')}`).join('')}
    <path d="M60 200V120H80V200" fill="#3a3f5c" stroke="${INK}" stroke-width="3"/><circle cx="70" cy="114" r="12" fill="#ffcf8a" stroke="${INK}" stroke-width="3"/>
    <path d="M70 126L30 200H110Z" fill="#fff3b0" opacity=".18"/>
    <g class="rain">${Array.from({ length: 40 }, (_, i) => `<path d="M${(i * 41) % 800} ${(i * 23) % 120}l-6 16" stroke="#9db6dd" stroke-width="2" opacity=".5"/>`).join('')}</g>
    ${ground(a)}`,
};

export const THEMES = [
  { key: 'manor', name: 'Moonlit Manor', accent: '#8e7cc3', ground: '#2a3a2e', re: /manor|mansion|masquerade|parlou?r|ballroom|estate|castle|butler|attic|dinner/i },
  { key: 'harbour', name: 'Stormy Harbour', accent: '#4ea3d8', ground: '#2f6fa8', re: /lighthouse|cruise|ship|harbou?r|boat|dock|sea\b|yacht|captain|deck/i },
  { key: 'stage', name: 'Final Curtain', accent: '#e2384d', ground: '#6b3a1e', re: /orchestra|film|theat|stage|opera|circus|concert|movie|soundstage/i },
  { key: 'museum', name: 'Midnight Museum', accent: '#e0b04c', ground: '#3a3348', re: /museum|gallery|library|archive|vault|chess|tournament|university/i },
  { key: 'kitchen', name: 'Kitchen Nightmare', accent: '#f08a4b', ground: '#c88a4a', re: /bakery|kitchen|cafe|restaurant|chef|bistro|diner|cake/i },
  { key: 'office', name: 'After-Hours Office', accent: '#3ec5b7', ground: '#283152', re: /startup|office|server|company|lab\b|laborator|tech/i },
  { key: 'garden', name: 'Poisoned Garden', accent: '#6cc070', ground: '#2f5a33', re: /garden|greenhouse|orangery|gazebo|farm|forest|park|picnic/i },
  { key: 'city', name: 'Rain-Soaked City', accent: '#9db6dd', ground: '#262c44', re: /city|street|alley|club|bar|hotel|station|train/i },
];

/** Pick the theme for a round: by story keywords first, then by round number so every level looks different. */
export function themeFor(title = '', content = null, roundNo = 1) {
  const text = [title, content?.story, ...(content?.locations || []).map((l) => l.name)].join(' ');
  return THEMES.find((t) => t.re.test(text)) || THEMES[(Math.max(1, roundNo) - 1) % THEMES.length];
}

export function sceneSvg(theme, cls = '') {
  return `<svg class="scene ${cls}" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="sky-${theme.key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1530"/><stop offset="1" stop-color="${theme.accent}" stop-opacity=".55"/></linearGradient></defs>
    <rect width="800" height="200" fill="url(#sky-${theme.key})"/>${SCENES[theme.key](theme.ground)}</svg>`;
}

/** Banner shown above the case file: scene, level, title. */
export function caseBanner(r, content, { big = false, right = '', label = '' } = {}) {
  const t = themeFor(r.title, content, r.round_no);
  return `<div class="case-banner${big ? ' big' : ''}" style="--acc:${t.accent}">${sceneSvg(t)}
    <div class="cb-in"><div class="cb-lvl"><span${/^Final/.test(label) ? ' class="cb-final"' : ''}>${label || `Level ${r.round_no}`}</span><span class="cb-th">${t.name}</span></div>
    <h2 class="cb-title">${String(r.title).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</h2></div>${right}</div>`;
}

/* ---------- evidence icons ---------- */
const WEAPON_ICONS = [
  [/knife|dagger|blade|sword|opener|chisel|saw/i, '🔪'], [/poison|vial|potion|bottle|champagne|tea|cup(?!.*trophy)/i, '🧪'],
  [/rope|chain|cable|cord|scarf/i, '🪢'], [/candle/i, '🕯️'], [/gun|pistol|revolver|flare/i, '🔫'], [/shears|scissor/i, '✂️'],
  [/hammer|mallet/i, '🔨'], [/poker|hook|pole|cane|stand|stanchion|winch|lamp/i, '🦯'], [/pin|bat|club|bookend|gnome|statue/i, '🪵'],
  [/trophy/i, '🏆'], [/skillet|pan|bowl/i, '🍳'], [/clock|metronome/i, '⏱️'], [/trumpet|horn/i, '🎺'], [/telescope/i, '🔭'],
  [/clapper/i, '🎬'], [/spool|monitor/i, '🖥️'],
];
const PLACE_ICONS = [
  [/gallery|egyptian|studio|museum/i, '🏺'], [/kitchen|bakery|counter|cafe/i, '🍳'], [/library|book|reading|archive|vault/i, '📚'], [/stage|pit|green room|soundstage|trailer|suite/i, '🎭'], [/green|garden|rose|orangery|gazebo/i, '🌿'],
  [/cellar|cold|store/i, '🍷'], [/balcony|terrace|rooftop/i, '🌙'], [/study|office|meeting|analysis/i, '🗄️'], [/attic/i, '🕸️'],
  [/garage|engine|boat/i, '🛠️'], [/parlou?r|lounge|hall|casino/i, '🛋️'],
  [/lantern|light/i, '🗼'], [/server/i, '🖥️'],
];
const iconFor = (list, name, dflt) => (list.find(([re]) => re.test(name)) || [0, dflt])[1];
export const weaponIcon = (n) => iconFor(WEAPON_ICONS, n, '🗡️');
export const placeIcon = (n) => iconFor(PLACE_ICONS, n, '📍');

/* ---------- detective ranks (by total points) ---------- */
export const RANKS = [[0, 'Rookie'], [100, 'Gumshoe'], [250, 'Sleuth'], [450, 'Inspector'], [700, 'Chief Inspector'], [1000, 'Legend']];
export const rankFor = (pts) => RANKS.filter(([m]) => pts >= m).pop()[1];
