import { sb, setMode, hostIdentity, playerIdentity, syncClock, serverNow } from '../supabase.js';
import { esc, topbar, $, fmtTime, flash, joinUrl, icon, badge, showGetReady, hideGetReady } from '../ui.js';
import { loadState, loadContent, subscribe, newSolves, scoreboardHtml, rosterHtml, counts, phase, feedHtml, podiumHtml, awardsHtml } from '../data.js';
import { caseHtml } from '../puzzles.js';

/** Projector view: the case file for the room, the live scoreboard (with per-round scores) and the feed. */
export async function mount(app, [gameId]) {
  // Use the host session if there is one, otherwise a player session in this game.
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
  const isHost = st.game.host_id === who.user.id;
  const ph = () => phase(st.current, serverNow());

  app.innerHTML = topbar(`<a class="btn sm sec" href="${isHost ? '#/admin/game/' + gameId : '#/play/' + gameId}">Back</a>`) + `
    <main class="wrap"><div class="page-h"><div><div class="eyebrow">Live scoreboard</div><h1 id="title"></h1></div><div id="status"></div></div>
      <div id="join"></div><div id="finale"></div><div id="case"></div><div id="lobby"></div>
      <div class="card flush mt"><div class="card-h"><h3>${icon('trophy', 18)} Scoreboard</h3><span class="muted sm">Scores for every round</span></div><div id="sb"></div></div>
      <div class="card flush mt"><div class="card-h"><h3>${icon('flag', 18)} Live activity</h3></div><div id="feed"></div></div></main>`;

  async function ensureContent() {
    const r = st.current, p = ph();
    if (r && (p === 'live' || p === 'closed') && contentFor !== r.id) {
      try { content = await loadContent(r.id); contentFor = content ? r.id : null; } catch { content = null; }
    }
    if (!r) { content = null; contentFor = null; }
  }

  function draw() {
    const g = st.game, r = st.current, p = ph(), c = counts(st), finished = g.status === 'finished';
    $('#title').textContent = g.title;
    $('#status').innerHTML = finished ? badge('ok', 'Final standings')
      : p === 'live' ? `<div class="timer-box"><div class="time" id="bt">–:––</div><div class="muted sm">Round ${r.round_no}: ${esc(r.title)}</div></div>`
      : p === 'countdown' ? badge('warn', 'Starting…') : p === 'closed' ? badge('ok', `Round ${r.round_no} finished`) : badge('', 'Waiting for the host');
    $('#join').innerHTML = g.status === 'lobby' && isHost
      ? `<div class="card callout brand"><div class="eyebrow">Join this game</div><div class="code-box mt-2" style="font-size:22px">${esc(joinUrl(g.join_code))}</div></div>` : '';
    $('#finale').innerHTML = finished
      ? `<div class="card mb center"><h2>Final standings</h2>${podiumHtml(st)}</div>${awardsHtml(st) ? `<div class="card mb"><h3 class="mb">Awards</h3>${awardsHtml(st)}</div>` : ''}` : '';

    // case file: shown to the room as soon as the countdown ends (the answer only appears after the host reveals it)
    const showCase = !finished && r && (p === 'live' || p === 'closed');
    $('#case').innerHTML = showCase
      ? `<div class="card case-proj"><div class="case-title"><h2>${esc(r.title)}</h2>${badge('brand', 'Round ' + r.round_no)}</div>
          ${content ? caseHtml(content, esc) : '<p class="muted">Opening the case file…</p>'}
          ${r.revealed && r.reveal ? `<div class="callout ok mt"><b>Answer:</b> ${esc(r.reveal.solution.suspect)} with the ${esc(r.reveal.solution.weapon)} in the ${esc(r.reveal.solution.location)}
            <p style="margin:6px 0 0;color:var(--ink)">${esc(r.reveal.explanation || '')}</p></div>` : ''}</div>` : '';

    $('#lobby').innerHTML = !finished && p !== 'live' && p !== 'closed'
      ? `<div class="card mt"><div class="card-h"><h3>${icon('users', 18)} In the lobby</h3>
         <span class="b">${c.players} player${c.players === 1 ? '' : 's'} · <span style="color:var(--ok)">${c.ready} ready</span></span></div>${rosterHtml(st)}</div>` : '';
    $('#sb').innerHTML = scoreboardHtml(st, { big: true });
    $('#feed').innerHTML = feedHtml(st.feed);
    tick();
  }

  const sig = (x) => JSON.stringify([x.game, x.teams, x.rounds, x.results, x.feed]);
  async function refresh(force = false) {
    prev = st;
    st = await loadState(gameId);
    const s = sig(st) + (content ? 1 : 0);
    if (!force && s === lastSig) return;
    lastSig = s;
    newSolves(prev, st).slice(0, 1).forEach((n) => flash(n));
    await ensureContent();
    draw();
  }

  function tick() {
    const r = st.current, p = ph();
    if (p !== lastPh) { const was = lastPh; lastPh = p; if (was) refresh(true).catch(() => {}); }
    if (p === 'countdown') showGetReady((new Date(r.started_at).getTime() - serverNow()) / 1000, r.settings.countdown ?? 15, `Round ${r.round_no}: ${r.title}`);
    else hideGetReady();
    if (p !== 'live') return;
    const left = (new Date(r.ends_at).getTime() - serverNow()) / 1000;
    const el = $('#bt');
    if (el) { el.textContent = fmtTime(left); el.classList.toggle('low', left <= 30); }
    if (left <= 0 && !closing) {
      closing = true;
      sb.rpc('close_expired', { p_round: r.id }).then(() => refresh(true)).finally(() => (closing = false));
    }
  }
  const timer = setInterval(tick, 250);

  lastPh = ph();
  await refresh(true);
  const unsub = subscribe(gameId, () => refresh().catch(() => {}));
  return () => { clearInterval(timer); unsub(); hideGetReady(); document.body.classList.remove('projector'); };
}
