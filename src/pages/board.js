import { sb, setMode, hostIdentity, playerIdentity, syncClock, serverNow } from '../supabase.js';
import { esc, topbar, $, $$, flash, joinUrl, icon, showGetReady, hideGetReady } from '../ui.js';
import { loadState, loadContent, subscribe, newSolves, scoreboardHtml, rosterHtml, counts, phase, feedHtml, podiumHtml, awardsHtml, levelLabel, roundPlan, roundTrackHtml, crownOnce, winnersData } from '../data.js';
import { caseViewShell, drawCaseView, setCaseViewTime } from '../caseview.js';
import { avatarSvg } from '../avatars.js';
import { revealCeremony, winnersCeremony } from '../fx.js';
import QRCode from 'qrcode';
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
  let caseKey = '', sortBy = 'total', seenReveal = new Set(), lastSec = -1, lastRetry = 0;
  const isHost = st.game.host_id === who.user.id;
  const ph = () => phase(st.current, serverNow());
  st.rounds.filter((r) => r.revealed).forEach((r) => seenReveal.add(r.id));   // don't replay old reveals

  app.innerHTML = topbar(`<a class="btn sm sec" href="${isHost ? '#/admin/game/' + gameId : '#/play/' + gameId}">Back</a>`) + `
    <main class="wrap proj-wrap">
      <header class="proj-h"><div id="host"></div>
        <div class="grow"><div class="proj-k">Projector</div><h1 id="title" class="proj-title"></h1></div>
        <div id="status"></div></header>
      <div id="track" class="rt-wrap"></div>
      <div id="join"></div><div id="finale"></div>
      <div id="casewrap" class="hidden">${caseViewShell({ gridTitle: 'Room deduction grid' })}</div>
      <div id="lobby"></div>
      <div class="card flush mt"><div class="card-h"><h3>${icon('trophy', 18)} Scoreboard</h3>
        <div class="seg" role="group" aria-label="Rank teams by"><button data-sort="total" aria-pressed="true">Overall</button><button data-sort="round" aria-pressed="false">This round</button></div></div><div id="sb"></div></div>
      <div class="card flush mt"><div class="card-h"><h3>${icon('flag', 18)} Live activity</h3></div><div id="feed"></div></div></main>`;

  /* ---------- admission ticket with a QR code ---------- */
  const qrCache = new Map();
  async function qrSvg(url) {
    if (!qrCache.has(url)) {
      try {
        qrCache.set(url, await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#12132b', light: '#ffffff' } }));
      } catch { qrCache.set(url, ''); }
    }
    return qrCache.get(url);
  }
  function ticketHtml(g, c, qr) {
    const url = joinUrl(g.join_code), short = url.replace(/^https?:\/\//, '');
    const tiles = [...String(g.join_code)].map((ch) => `<span class="tk-tile">${esc(ch)}</span>`).join('');
    return `<section class="ticket" aria-label="How to join">
      <div class="tk-stub"><div class="tk-qr" role="img" aria-label="QR code for the join link">${qr || '<span class="muted sm">QR code unavailable</span>'}</div>
        <div class="tk-scan">${icon('search', 15)} Scan with your phone camera</div></div>
      <div class="tk-body">
        <div class="tk-k">You’re invited to the investigation</div>
        <h2 class="tk-h">Join with code</h2>
        <div class="tk-code" aria-label="Game code ${esc(g.join_code)}">${tiles}</div>
        <div class="tk-url">${icon('link', 16)} ${esc(short)}</div>
        <div class="tk-stats"><span><b>${c.teams}</b> team${c.teams === 1 ? '' : 's'}</span><span><b>${c.players}</b> detective${c.players === 1 ? '' : 's'}</span>
          <span class="ok"><b>${c.ready}</b> ready</span></div>
      </div>
      <div class="tk-art" aria-hidden="true">🕵️</div>
    </section>`;
  }

  $$('[data-sort]').forEach((b) => (b.onclick = () => {
    sortBy = b.dataset.sort; $$('[data-sort]').forEach((x) => x.setAttribute('aria-pressed', x === b)); drawBoard();
  }));

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
    const key = [r.id, content ? 1 : 0, r.revealed && r.reveal ? 1 : 0, p].join('|');
    if (key === caseKey) return;
    caseKey = key;
    drawCaseView($('#casewrap'), {
      r, content, phase: p, label: levelLabel(st, r), gridKey: `cc-proj-grid:${r.id}`,
      note: isHost ? 'Mark the grid here to walk the room through the logic. Marks stay on this screen only.' : 'Marks stay on this screen only.',
    });
  }

  function draw() {
    const g = st.game, r = st.current, p = ph(), c = counts(st), finished = g.status === 'finished';
    $('#title').textContent = g.title;
    const ha = g.settings?.host_avatar;
    $('#host').innerHTML = ha ? `<div class="host-av" title="Lead investigator">${avatarSvg(ha, 64)}</div>` : '';
    const plan = roundPlan(st, serverNow());
    $('#status').innerHTML = finished ? `<span class="pill gold">🏆 Final standings</span>`
      : p === 'live' ? `<span class="pill live"><i></i>${esc(levelLabel(st, r))}</span>`
      : p === 'countdown' ? `<span class="pill warn">Starting…</span>`
      : p === 'closed' ? (plan.finalDone ? `<span class="pill gold">Final round finished</span>` : `<span class="pill ok">${esc(levelLabel(st, r))} finished</span>`)
      : `<span class="pill">Waiting for the host</span>`;
    $('#track').innerHTML = roundTrackHtml(st, serverNow());
    const showJoin = !finished && p !== 'live' && isHost;
    if (showJoin) {
      $('#join').innerHTML = ticketHtml(g, c, qrCache.get(joinUrl(g.join_code)));
      if (!qrCache.has(joinUrl(g.join_code))) qrSvg(joinUrl(g.join_code)).then(() => { if ($('#join .ticket')) $('#join').innerHTML = ticketHtml(g, counts(st), qrCache.get(joinUrl(g.join_code))); });
    } else $('#join').innerHTML = '';
    $('#finale').innerHTML = finished
      ? `<section class="finale"><div class="fn-k">Case files closed</div><h2 class="fn-h">Final standings</h2>${podiumHtml(st)}
          <button class="btn sec sm mt" id="replay">🎉 Play the winners ceremony again</button></section>
         ${awardsHtml(st) ? `<div class="card mb"><h3 class="mb">Special awards</h3>${awardsHtml(st)}</div>` : ''}`
      : plan.finalDone ? `<div class="callout brand mb center"><b>That was the final round!</b> The host is about to crown the winners.</div>` : '';
    const rp = $('#replay');
    if (rp) rp.onclick = () => winnersCeremony(winnersData(st), { title: g.title });
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
    crownOnce(st, { scope: 'board' });
  }

  function tick() {
    const r = st.current, p = ph();
    if (p !== lastPh) { const was = lastPh; lastPh = p; if (was) refresh(true).catch(() => {}); }
    if (p === 'countdown') showGetReady((new Date(r.started_at).getTime() - serverNow()) / 1000, r.settings.countdown ?? 15, `${levelLabel(st, r)}: ${r.title}`);
    else hideGetReady(p === 'live');
    document.body.classList.remove('tense');
    if (p !== 'live') return;
    if (contentFor !== r.id && Date.now() - lastRetry > 2000) { lastRetry = Date.now(); refresh(true).catch(() => {}); }   // case text not loaded yet: keep trying
    const left = (new Date(r.ends_at).getTime() - serverNow()) / 1000;
    setCaseViewTime($('#casewrap'), left, (new Date(r.ends_at) - new Date(r.started_at)) / 1000);
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
