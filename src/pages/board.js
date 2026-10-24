import { sb, whoAmI, syncClock, serverNow } from '../supabase.js';
import { esc, topbar, $, fmtTime, flash, joinUrl } from '../ui.js';
import { loadState, standings, subscribe, newSolves, leaderboardHtml } from '../data.js';

export async function mount(app, [gameId]) {
  const { user } = await whoAmI();
  if (!user) {
    app.innerHTML = topbar() + `<main><div class="card"><h2>Sign in required</h2>
      <p>Open this page in the browser where you are signed in as host, or as a player in this game.</p>
      <a href="#/admin/login">Host sign in</a></div></main>`;
    return;
  }
  await syncClock();
  document.body.classList.add('projector');

  let st = await loadState(gameId), prev = st, lastSig = '', closing = false;
  const isHost = st.game.host_id === user.id;

  app.innerHTML = topbar(`<a class="btn s o" style="color:#f5efdc;text-decoration:none" href="${isHost ? '#/admin/game/' + gameId : '#/play/' + gameId}">Back</a>`) + `
    <main><h1 id="title"></h1><div id="join"></div><div id="round"></div>
    <div class="card" style="padding:0" id="lb"></div><div id="reveal"></div></main>`;

  function draw() {
    const g = st.game, r = st.current;
    $('#title').textContent = g.title;
    $('#join').innerHTML = g.status === 'lobby' && isHost
      ? `<div class="card"><b>Join this game:</b> <span class="code">${esc(joinUrl(g.join_code))}</span></div>` : '';
    $('#round').innerHTML = g.status === 'finished'
      ? '<div class="card"><h2>Final standings</h2></div>'
      : r ? `<div class="card"><b>Round ${r.round_no}: ${esc(r.content.title)}</b>
          ${r.status === 'live' ? '<span class="timer" id="bt" style="margin-left:16px"></span>' : ' <span class="pill done">closed</span>'}</div>`
        : '<div class="card"><b>Waiting for the host to start a round…</b></div>';
    $('#lb').innerHTML = leaderboardHtml(standings(st));
    $('#reveal').innerHTML = r?.revealed && r.reveal
      ? `<div class="card"><h3>The answer</h3><p class="ok">${esc(r.reveal.solution.suspect)} with the ${esc(r.reveal.solution.weapon)} in the ${esc(r.reveal.solution.location)}</p>
         <p>${esc(r.reveal.explanation || '')}</p></div>` : '';
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
    const el = $('#bt'), r = st.current;
    if (!el || !r || r.status !== 'live') return;
    const left = (new Date(r.ends_at).getTime() - serverNow()) / 1000;
    el.textContent = '⏱ ' + fmtTime(left);
    el.classList.toggle('low', left <= 30);
    if (left <= 0 && !closing) {
      closing = true;
      sb.rpc('close_expired', { p_round: r.id }).then(() => refresh(true)).finally(() => (closing = false));
    }
  }
  const timer = setInterval(tick, 500);

  await refresh(true);
  const unsub = subscribe(gameId, () => refresh().catch(() => {}));
  return () => { clearInterval(timer); unsub(); document.body.classList.remove('projector'); };
}
