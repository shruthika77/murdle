import { whoAmI, syncClock, serverNow } from '../supabase.js';
import { esc, topbar, $, fmtTime, flash, joinUrl, icon, badge, showGetReady, hideGetReady } from '../ui.js';
import { loadState, standings, subscribe, newSolves, leaderboardHtml, rosterHtml, counts, phase } from '../data.js';
import { sb } from '../supabase.js';

export async function mount(app, [gameId]) {
  const { user } = await whoAmI();
  if (!user) {
    app.innerHTML = topbar() + `<main class="wrap"><div class="narrow"><div class="card"><h2>Sign in required</h2>
      <p class="muted mt-2">Open this page in the browser where you are signed in as host, or as a player in this game.</p>
      <a class="btn mt" href="#/admin/login">Host sign in</a></div></div></main>`;
    return;
  }
  await syncClock();
  document.body.classList.add('projector');

  let st = await loadState(gameId), prev = st, lastSig = '', closing = false, lastPh = '';
  const isHost = st.game.host_id === user.id;

  app.innerHTML = topbar(`<a class="btn sm sec" href="${isHost ? '#/admin/game/' + gameId : '#/play/' + gameId}">Back</a>`) + `
    <main class="wrap"><div class="page-h"><div><div class="eyebrow">Live scoreboard</div><h1 id="title"></h1></div><div id="status"></div></div>
      <div id="join"></div><div id="lobby"></div>
      <div class="card flush mt"><div class="card-h"><h3>${icon('trophy', 18)} Leaderboard</h3></div><div id="lb"></div></div>
      <div id="reveal"></div></main>`;

  const ph = () => phase(st.current, serverNow());

  function draw() {
    const g = st.game, r = st.current, p = ph(), c = counts(st);
    $('#title').textContent = g.title;
    $('#status').innerHTML = g.status === 'finished' ? badge('ok', 'Final standings')
      : p === 'live' ? `<div class="timer-box"><div class="time" id="bt">–:––</div><div class="muted sm">Round ${r.round_no}: ${esc(r.title)}</div></div>`
      : p === 'countdown' ? badge('warn', 'Starting…') : badge('', 'Waiting for the host');
    $('#join').innerHTML = g.status === 'lobby' && isHost
      ? `<div class="card callout brand"><div class="eyebrow">Join this game</div><div class="code-box mt-2" style="font-size:20px">${esc(joinUrl(g.join_code))}</div></div>` : '';
    const showLobby = g.status !== 'finished' && p !== 'live';
    $('#lobby').innerHTML = showLobby ? `<div class="card mt"><div class="card-h"><h3>${icon('users', 18)} In the lobby</h3>
      <span class="b">${c.players} player${c.players === 1 ? '' : 's'} · <span style="color:var(--ok)">${c.ready} ready</span></span></div>${rosterHtml(st)}</div>` : '';
    $('#lb').innerHTML = leaderboardHtml(standings(st));
    $('#reveal').innerHTML = r?.revealed && r.reveal
      ? `<div class="card mt"><h3>The answer</h3><p class="b mt-2" style="color:var(--ok);font-size:20px">${esc(r.reveal.solution.suspect)} with the ${esc(r.reveal.solution.weapon)} in the ${esc(r.reveal.solution.location)}</p>
         <p class="muted">${esc(r.reveal.explanation || '')}</p></div>` : '';
    tick();
  }

  const sig = (x) => JSON.stringify([x.game, x.teams, x.rounds, x.results]);
  async function refresh(force = false) {
    prev = st;
    st = await loadState(gameId);
    const s = sig(st);
    if (!force && s === lastSig) return;
    lastSig = s;
    newSolves(prev, st).slice(0, 1).forEach(flash);
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
