import { standings, awards } from './data.js';
import { avatarSvg } from './avatars.js';
import { rankFor } from './themes.js';
import { toast } from './ui.js';

const x = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const strip = (svg) => svg.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

/** Builds a case-dossier certificate for one team and downloads it as a PNG. */
export async function downloadDossier(st, teamId) {
  const rows = standings(st), pos = rows.findIndex((r) => r.team.id === teamId), row = rows[pos];
  if (!row) return;
  const t = row.team, won = awards(st).filter((a) => a.team === t.name);
  const W = 1200, H = 800;
  const faces = t.team_members.slice(0, 6).map((m, i) =>
    `<g transform="translate(${600 - (Math.min(6, t.team_members.length) * 110) / 2 + i * 110 + 5},300)"><rect x="-4" y="-4" width="108" height="108" rx="54" fill="#141a2e"/>
      <clipPath id="c${i}"><circle cx="50" cy="50" r="50"/></clipPath><g clip-path="url(#c${i})"><svg width="100" height="100" viewBox="0 0 64 64">${strip(avatarSvg(m.avatar || {}, 100))}</svg></g>
      <text x="50" y="128" text-anchor="middle" font-size="18" fill="#3a2c18" font-family="Georgia,serif">${x(m.player_name)}</text></g>`).join('');
  const rounds = st.rounds.map((r) => { const v = row.byRound[r.id];
    return `${x(r.title)}: ${v ? (v.solved ? 'solved, ' + v.score + ' pts' : v.score + ' pts') : 'not played'}`; });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#141a2e"/>
    <path d="M60 90H420L460 50H1140V760H60Z" fill="#f2d38a" stroke="#3a2c18" stroke-width="4"/>
    <rect x="90" y="110" width="1020" height="620" fill="#fbf3df" stroke="#c9a85c" stroke-width="2"/>
    <text x="600" y="180" text-anchor="middle" font-size="22" letter-spacing="6" fill="#8a6a2a" font-family="Georgia,serif">OFFICIAL CASE DOSSIER</text>
    <text x="600" y="240" text-anchor="middle" font-size="54" font-weight="700" fill="#141a2e" font-family="Georgia,serif">${x(t.name)}</text>
    <text x="600" y="276" text-anchor="middle" font-size="22" fill="#5d4a2a" font-family="Georgia,serif">${x(st.game.title)}</text>
    ${faces}
    <text x="600" y="490" text-anchor="middle" font-size="30" fill="#141a2e" font-family="Georgia,serif">Finished #${pos + 1} of ${rows.length} with ${row.total} points, ${row.solved} case${row.solved === 1 ? '' : 's'} solved</text>
    <text x="600" y="532" text-anchor="middle" font-size="24" fill="#8a6a2a" font-family="Georgia,serif">Detective rank: ${rankFor(row.total)}${won.length ? ' · ' + won.map((a) => a.title).join(', ') : ''}</text>
    ${rounds.slice(0, 5).map((r, i) => `<text x="600" y="${580 + i * 28}" text-anchor="middle" font-size="18" fill="#5d4a2a" font-family="Georgia,serif">${r}</text>`).join('')}
    <g transform="translate(930,600) rotate(-14)"><rect x="-120" y="-40" width="240" height="80" rx="10" fill="none" stroke="#e2384d" stroke-width="7"/>
      <text x="0" y="14" text-anchor="middle" font-size="40" font-weight="700" fill="#e2384d" font-family="Impact,Arial Black,sans-serif">CASE CLOSED</text></g>
  </svg>`;
  try {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(img, 0, 0);
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = `${t.name.replace(/[^\w]+/g, '-')}-case-dossier.png`;
    a.click();
  } catch {
    // Some browsers refuse to rasterise; fall back to the SVG itself.
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    a.download = `${t.name.replace(/[^\w]+/g, '-')}-case-dossier.svg`;
    a.click();
    toast('Saved the dossier as an SVG image.');
  }
}
