import { sb, setMode, hostIdentity, playerIdentity, syncClock, serverNow } from '../supabase.js';
import { esc, topbar, $, $$, fmtTime, flash, joinUrl, icon, badge, showGetReady, hideGetReady } from '../ui.js';
import { loadState, loadContent, subscribe, newSolves, scoreboardHtml, rosterHtml, counts, phase, feedHtml, podiumHtml, awardsHtml } from '../data.js';
import { caseHtml } from '../puzzles.js';
import { mountGrid } from '../grid.js';
import { caseBanner } from '../themes.js';
import { avatarSvg } from '../avatars.js';
import { revealCeremony } from '../fx.js';
import { sfx } from '../sfx.js';

/**
 * Projector view for the room: the full case file and deduction grid (same as the teams see),
 * the shared scoreboard with each team's score for the current round, and the live feed.
 * The answer stays hidden, even from the host, until "Reveal answer" is pressed.
 */
export async function mount(app, [gameId]) {
  const h = await hostIdentity();
  setMode(h.role === 'admin' ? 'host' : 'player');
  const who = h.role === 'admin' ? h : await playerIdentity();
  if (!who.user) {
    app.innerHTML = topbar() + `<main class="wrap"><div class="narrow"><div class="card"><h2>Sign in required</h2>
      <p class="muted mt-2">Open this page in the browser where you are signed in as host, or as a player in this game.</p>
      <a class="btn mt" href="#/admin/login">Host sign in</a></div></div></main>`;
    return;
  }
  await syncClock();
  document.body.classList.add('projector');

  let st = await loadState(gameId), prev = st, lastSig = '', closing = false, lastPh = '', content = null, contentFor = null;
  let caseKey = '', grid = null, sortBy = 'total', seenReveal = new Set(), lastSec = -1, lastRetry = 0;
  const isHost = st.game.host_id === who.user.id;
  const ph = () => phase(st.current, serverNow());
  st.rounds.filter((r) => r.revealed).forEach((r) => seenReveal.add(r.id));   // don't replay old reveals

  app.innerHTML = topbar(`<a class="btn sm sec" href="${isHost ? '#/admin/game/' + gameId : '#/play/' + gameId}">Back</a>`) + `
    <main class="wrap"><div class="page-h"><div class="flex gap-3"><div id="host"></div><div><div class="kicker">Projector</div><h1 id="title"></h1></div></div><div id="status"></div></div>
      <div id="join"></div><div id="finale"></div>
      <div id="casewrap" class="hidden"><div id="banner"></div>
        <div class="cols proj"><div class="card paper" id="case"></div>
          <div class="stack side"><div class="card"><div class="card-h"><h3>${icon('search', 18)} Room deduction grid</h3>
            <button class="btn sm ghost" id="clr">Clear</button></div><div id="grid"></div>
            <p class="muted xs mt-2">${isHost ? 'Mark the grid here to walk the room through the logic. Marks stay on this screen only.' : 'Marks stay on this screen only.'}</p></div>
            <div id="answer"></div></div></div></div>
      <div id="lobby"></div>
      <div class="card flush mt"><div class="card-h"><h3>${icon('trophy', 18)} Scoreboard</h3>
        <div class="seg" role="group" aria-label="Rank teams by"><button data-sort="total" aria-pressed="true">Overall</button><button data-sort="round" aria-pressed="false">This round</button></div></div><div id="sb"></div></div>
      <div class="card flush mt"><div class="card-h"><h3>${icon('flag', 18)} Live activity</h3></div><div id="feed"></div></div></main>`;

  $$('[data-sort]').forEach((b) => (b.onclick = () => {
    sortBy = b.dataset.sort; $$('[data-sort]').forEach((x) => x.setAttribute('aria-pressed', x === b)); drawBoard();
  }));
  $('#clr').onclick = () => { if (grid && confirm('Clear the room grid?')) grid.clear(); };

  async function ensureContent() {
    const r = st.current, p = ph();
    if (!r) { content = null; contentFor = null; return; }
    if ((p === 'live' || p === 'closed') && contentFor !== r.id) {
      try { content = await loadContent(r.id); contentFor = content ? r.id : null; } catch { content = null; }
    }
  }

  function drawBoard() {
    $('#sb').innerHTML = scoreboardHtml(st, { big: true, sortBy, phaseNow: ph() });
    $$('[data-sort="round"]').forEach((b) => (b.disabled = !st.current || ph() === 'cancelled'));
  }

  function drawCase() {
    const r = st.current, p = ph(), finished = st.game.status === 'finished';
    const show = !finished && r && (p === 'live' || p === 'closed');
    $('#casewrap').classList.toggle('hidden', !show);
    if (!show) { caseKey = ''; return; }
    const sol = r.revealed && r.reveal ? r.reveal.solution : null;
    const key = [r.id, content ? 1 : 0, sol ? 1 : 0].join('|');
    if (key === caseKey) return;
    caseKey = key;
    $('#banner').innerHTML = caseBanner(r, content, { big: true, right: `<div class="cb-timer" id="btwrap">${p === 'live' ? '<div class="time" id="bt">–:––</div><div class="xs">time left</div>' : badge('ok', 'Round closed')}</div>` });
    $('#case').innerHTML = content ? caseHtml(content, esc) : '<p class="muted">Opening the case file…</p>';
    if (content) grid = mountGrid($('#grid'), content, `cc-proj-grid:${r.id}`, { solution: sol });
    else $('#grid').innerHTML = '<p class="muted">The grid appears with the case file.</p>';
    $('#answer').innerHTML = sol
      ? `<div class="card answer"><div class="kicker">Solution</div><p class="ans"><b>${esc(sol.suspect)}</b> with the <b>${esc(sol.weapon)}</b> in the <b>${esc(sol.location)}</b></p>
          <p class="sm">${esc(r.reveal.explanation || '')}</p></div>`
      : `<div class="card sealed"><div class="seal" aria-hidden="true">🔒</div><div><b>Answer sealed</b><p class="muted sm" style="margin:0">Hidden from everyone, the host included, until “Reveal answer” is pressed.</p></div></div>`;
  }

  function draw() {
    const g = st.game, r = st.current, p = ph(), c = counts(st), finished = g.status === 'finished';
    $('#title').textContent = g.title;
    const ha = g.settings?.host_avatar;
    $('#host').innerHTML = ha ? `<div class="host-av" title="Lead investigator">${avatarSvg(ha, 64)}</div>` : '';
    $('#status').innerHTML = finished ? badge('ok', 'Final standings')
      : p === 'live' ? badge('live', `Level ${r.round_no} in play`)
      : p === 'countdown' ? badge('warn', 'Starting…') : p === 'closed' ? badge('ok', `Level ${r.round_no} finished`) : badge('', 'Waiting for the host');
    $('#join').innerHTML = g.status !== 'finished' && (p !== 'live') && isHost
      ? `<div class="card join-card"><div><div class="kicker">Join the investigation</div><div class="join-url">${esc(joinUrl(g.join_code))}</div>
         <p class="muted sm" style="margin:6px 0 0">Or enter the code <b class="code">${esc(g.join_code)}</b> on the start page.</p></div><div class="join-ic" aria-hidden="true">🕵️</div></div>` : '';
    $('#finale').innerHTML = finished
      ? `<div class="card mb center"><h2>Final standings</h2>${podiumHtml(st)}</div>${awardsHtml(st) ? `<div class="card mb"><h3 class="mb">Awards</h3>${awardsHtml(st)}</div>` : ''}` : '';
    $('#lobby').innerHTML = !finished && p !== 'live' && p !== 'closed'
      ? `<div class="card mt"><div class="card-h"><h3>${icon('users', 18)} In the lobby</h3>
         <span class="b">${c.players} player${c.players === 1 ? '' : 's'}, <span style="color:var(--ok)">${c.ready} ready</span></span></div>${rosterHtml(st)}</div>` : '';
    drawCase();
    drawBoard();
    $('#feed').innerHTML = feedHtml(st.feed);
    tick();
  }

  const sig = (x) => JSON.stringify([x.game, x.teams, x.rounds, x.results, x.feed]);
  async function refresh(force = false) {
    prev = st;
    st = await loadState(gameId);
    await ensureContent();                               // always, so a missed load is retried
    const s = sig(st) + '|' + (contentFor || '') + '|' + ph();
    if (!force && s === lastSig) return;
    lastSig = s;
    newSolves(prev, st).slice(0, 1).forEach((n) => flash(n));
    const r = st.current;
    if (r && r.revealed && r.reveal && !seenReveal.has(r.id)) { seenReveal.add(r.id); revealCeremony(r.reveal, r.title); }
    draw();
  }

  function tick() {
    const r = st.current, p = ph();
    if (p !== lastPh) { const was = lastPh; lastPh = p; if (was) refresh(true).catch(() => {}); }
    if (p === 'countdown') showGetReady((new Date(r.started_at).getTime() - serverNow()) / 1000, r.settings.countdown ?? 15, `Level ${r.round_no}: ${r.title}`);
    else hideGetReady(p === 'live');
    document.body.classList.remove('tense');
    if (p !== 'live') return;
    if (contentFor !== r.id && Date.now() - lastRetry > 2000) { lastRetry = Date.now(); refresh(true).catch(() => {}); }   // case text not loaded yet: keep trying
    const left = (new Date(r.ends_at).getTime() - serverNow()) / 1000;
    const el = $('#bt');
    if (el) { el.textContent = fmtTime(left); el.classList.toggle('low', left <= 30); }
    document.body.classList.toggle('tense', left <= 30 && left > 0);
    const sec = Math.ceil(left);
    if (sec !== lastSec) { lastSec = sec; if (sec <= 10 && sec > 0) sfx.tick(); }
    if (left <= 0 && !closing) {
      closing = true;
      sb.rpc('close_expired', { p_round: r.id }).then(() => refresh(true)).finally(() => (closing = false));
    }
  }
  const timer = setInterval(tick, 250);

  lastPh = ph();
  await refresh(true);
  const unsub = subscribe(gameId, () => refresh().catch(() => {}));
  return () => { clearInterval(timer); unsub(); hideGetReady(); document.body.classList.remove('projector', 'tense'); };
}
