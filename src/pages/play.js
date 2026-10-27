import { sb, whoAmI, syncClock, serverNow } from '../supabase.js';
import { esc, topbar, $, guard, toast, fmtTime, flash, copyText, icon, badge, showGetReady, hideGetReady } from '../ui.js';
import { loadState, loadContent, standings, subscribe, newSolves, leaderboardHtml, rosterHtml, counts, phase, feedHtml, podiumHtml, awardsHtml, levelLabel, roundPlan, roundTrackHtml, crownOnce, timeAdded } from '../data.js';
import { mountAvatarPicker, sanitize } from '../avatars.js';
import { caseViewShell, drawCaseView, setCaseViewTime } from '../caseview.js';
import { rankFor } from '../themes.js';
import { revealCeremony } from '../fx.js';
import { sfx } from '../sfx.js';
import { downloadDossier } from '../dossier.js';

export async function mount(app, [gameId]) {
  const { user, role } = await whoAmI();
  const notJoined = () => {
    app.innerHTML = topbar() + `<main class="wrap"><div class="narrow"><div class="card center"><h2>You’re not on a team yet</h2>
      <p class="muted mt-2">Open the join link your host sent you to create a team or join one.</p><a class="btn sec" href="#/">Back</a></div></div></main>`;
  };
  if (!user) return notJoined();
  await syncClock();

  let st;
  try { st = await loadState(gameId); } catch { return notJoined(); }
  const me = st.teams.find((t) => t.team_members.some((m) => m.user_id === user.id));
  if (!me) return notJoined();
  localStorage.setItem('cc_game', gameId);
  const { data: sec } = await sb.from('team_secrets').select('code').eq('team_id', me.id).maybeSingle();
  const code = sec?.code || '';

  let prev = st, attempts = [], hints = [], content = null, contentFor = null, closing = false, lastSig = '', lastPh = '', lastSec = -1, lastRetry = 0;
  const seenReveal = new Set(st.rounds.filter((r) => r.revealed).map((r) => r.id));
  const keys = { puzzle: '', form: '' };

  app.innerHTML = topbar(`<span class="badge brand">${icon('users', 13)} ${esc(me.name)}</span>`) + `
    <main class="wrap">
      <div id="banner"></div><div id="finale"></div>
      <div id="game" class="hidden">${caseViewShell({
        gridTitle: 'Team deduction grid',
        leftExtra: '<div id="notebook"></div>',
        sideExtra: '<div id="panel"></div><div id="form"></div>',
      })}</div>
      <div id="lobby" class="hidden"></div>
      <div class="cols even mt"><div class="card flush"><div class="card-h"><h3>${icon('trophy', 17)} Leaderboard</h3><span class="muted xs">Detective rank grows with your points</span></div><div id="lb"></div></div>
        <div class="card flush"><div class="card-h"><h3>${icon('flag', 17)} Live activity</h3></div><div id="feed"></div></div></div>
    </main>`;

  const myMember = () => st.teams.flatMap((t) => t.team_members).find((m) => m.user_id === user.id);
  const myResult = () => st.current
    ? st.results.find((r) => r.round_id === st.current.id && r.team_id === me.id) || { attempts: 0, done: false, solved: false, score: 0 }
    : null;
  const ph = () => phase(st.current, serverNow());

  // ---------- team bar ----------
  function drawBanner() {
    $('#banner').innerHTML = `<div class="card flex wrapf mb"><div class="grow"><div class="kicker">Your team</div>
      <h2 style="margin-top:2px">${esc(me.name)}</h2><div class="muted sm">${esc(st.game.title)}</div></div>
      <div class="right"><div class="kicker">Team code for teammates</div>
        <div class="flex" style="justify-content:flex-end"><b style="font:700 26px var(--display);letter-spacing:.14em">${esc(code)}</b>
        <button class="btn sm sec" id="ctc" aria-label="Copy team code">${icon('copy', 15)} Copy</button></div></div></div>`;
    $('#ctc').onclick = () => copyText(code);
  }

  // ---------- waiting room ----------
  function drawLobby() {
    const p = ph(), c = counts(st), mm = myMember();
    const first = !st.rounds.length;
    const plan = roundPlan(st, serverNow());
    const nextNo = st.rounds.length + 1, nextFinal = plan.total && nextNo === plan.total;
    const title = p === 'countdown' ? 'Round starting…' : first ? 'Waiting room'
      : plan.allStarted ? 'All rounds played' : nextFinal ? 'Up next: the final round' : `Waiting for round ${nextNo}${plan.total ? ` of ${plan.total}` : ''}`;
    const sub = p === 'countdown' ? 'Get ready. The case opens in a moment.'
      : first ? `Waiting for your host to start${plan.total ? ` the first of ${plan.total} rounds` : ''}. Teammates can join with your team code.`
      : plan.allStarted ? 'Your host is about to crown the winners. Fingers crossed!'
      : nextFinal ? 'One case left. Everything is still to play for.' : 'Take a breath. The host will start the next round soon.';
    $('#lobby').innerHTML = `<div class="card"><div class="card-h"><div><h3>${icon('users', 17)} ${title}</h3><div class="muted sm mt-2">${sub}</div></div>
      <div class="flex"><span class="pulse-dot"></span><span class="sm b">${c.ready} of ${c.players} ready</span></div></div>
      ${plan.total ? `<div class="rt-wrap mb">${roundTrackHtml(st, serverNow())}</div>` : ''}
      ${rosterHtml(st, { meId: user.id })}
      <div class="flex wrapf mt">
        <button class="btn ${mm?.ready ? 'sec' : ''}" id="rdy">${mm?.ready ? icon('check', 16) + ' You’re ready. Tap to undo' : 'I’m ready'}</button>
        <button class="btn sec" id="eav">Edit my avatar</button>
        <span class="muted sm">Tell the host you’re set. It doesn’t start the game.</span></div>
      <div id="avbox" class="hidden mt"></div></div>`;
    $('#eav').onclick = () => {
      const box = $('#avbox'); const open = box.classList.toggle('hidden') === false;
      if (open && !box.firstChild) {
        const mine = myMember();
        const pk = mountAvatarPicker(box, sanitize(mine?.avatar), async (c) => {
          const { error } = await sb.rpc('set_avatar', { p_game: gameId, p_avatar: c });
          if (error) return toast(error.message, true);
          try { localStorage.setItem('cc_avatar', JSON.stringify(c)); } catch { /* ignore */ }
        });
        void pk;
      }
    };
    guard($('#rdy'), async () => {
      const { error } = await sb.rpc('set_ready', { p_game: gameId, p_ready: !mm?.ready });
      if (error) throw new Error(error.message);
      await refresh(true);
    });
  }

  // ---------- case file + grid ----------
  const gridKey = () => `cc-grid2:${st.current.id}:${me.id}`;
  const notesKey = () => `cc-notes:${st.current.id}:${me.id}`;
  function drawCase() {
    const r = st.current;
    drawCaseView($('#game'), {
      r, content, phase: ph(), label: levelLabel(st, r), ruled: new Set(hints.map((h) => h.value)), gridKey: gridKey(),
      note: 'Your marks are saved on this device.',
    });
  }
  function drawNotebook() {
    if (!content) { $('#notebook').innerHTML = ''; return; }
    let notes = '';
    try { notes = localStorage.getItem(notesKey()) || ''; } catch { /* ignore */ }
    $('#notebook').innerHTML = `<div class="card notebook"><div class="card-h"><h3>📒 Detective notebook</h3><span class="muted xs" id="nsv"></span></div>
      <textarea id="notes" maxlength="2000" placeholder="Jot down hunches, alibis and contradictions…" aria-label="Detective notebook">${esc(notes)}</textarea></div>`;
    $('#notes').oninput = (e) => {
      try { localStorage.setItem(notesKey(), e.target.value); $('#nsv').textContent = 'Saved on this device'; } catch { /* ignore */ }
    };
  }

  // ---------- side panel (timer, attempts) ----------
  function drawPanel() {
    const r = st.current, res = myResult(), p = ph();
    if (!r) return;
    const maxHints = r.settings.max_hints ?? 2, hintCost = r.settings.hint_cost ?? 15;
    const solvedCount = st.results.filter((x) => x.round_id === r.id && x.solved).length;
    const hist = attempts.length ? `<ul class="hist">${attempts.map((a, i) =>
      `<li><span>Try ${i + 1}: ${esc(a.answer.suspect)}, ${esc(a.answer.weapon)}, ${esc(a.answer.location)}</span>
       <b style="color:${a.correct_count === 3 ? 'var(--ok)' : 'var(--muted)'}">${a.correct_count}/3</b></li>`).join('')}</ul>` : '';
    $('#panel').innerHTML = `<div class="card"><div class="card-h"><h3>${icon('users', 17)} ${esc(me.name)}</h3>${p === 'live' ? badge('live', 'Investigating') : badge('ok', 'Round closed')}</div>
      <div class="flex between"><span class="muted sm">Attempts</span><b>${res.attempts} / ${r.settings.max_attempts}</b></div>
      ${res.solved ? `<div class="callout ok mt-2"><b>Solved! +${res.score} points</b></div>`
        : res.done ? `<div class="callout warn mt-2"><b>Finished.</b> ${res.score} points</div>` : ''}
      ${hist}
      <div class="race"><span class="muted">Teams that solved it</span><b>${solvedCount} of ${st.teams.length}</b></div>
      <div class="dots-row mt-2">${st.teams.map((t) => `<i class="${st.results.some((x) => x.round_id === r.id && x.team_id === t.id && x.solved) ? 'on' : ''}" title="${esc(t.name)}"></i>`).join('')}</div>
      ${solvedCount && !res.done && p === 'live' ? `<p class="muted xs mt-2">Another team has solved it, but the round is still open. You can still earn points until the timer ends.</p>` : ''}
      ${maxHints ? `<div class="mt" style="border-top:1px solid var(--line);padding-top:12px">
        <div class="flex between"><b>${icon('book', 15)} Detective hints</b><span class="muted sm">${hints.length} / ${maxHints} used</span></div>
        <div class="hint-list">${hints.map((h) => `<div class="hint">${icon('x', 14)} <span><b>${esc(h.value)}</b> is not the ${esc(h.kind)}</span></div>`).join('')}</div>
        ${p === 'live' && !res.done && hints.length < maxHints
          ? `<button class="btn sec sm block mt-2" id="hint">Buy a hint (−${hintCost} points)</button>` : ''}</div>` : ''}
      </div>`;
    guard($('#hint'), async () => {
      if (!confirm(`Buy a hint? It rules out one wrong answer and costs ${hintCost} points from this round.`)) return;
      const { data, error } = await sb.rpc('use_hint', { p_round: r.id });
      if (error) throw new Error(error.message);
      toast(`Hint: ${data.value} is not the ${data.kind}.`);
      await refresh(true);
    });
    tick();
  }

  // ---------- answer form ----------
  function drawForm() {
    const r = st.current, res = myResult();
    if (!r || ph() !== 'live' || st.game.status === 'finished' || res.done || !content) { $('#form').innerHTML = ''; return; }
    const max = r.settings.max_attempts;
    const opts = (a) => a.map((x) => `<option>${esc(x.name)}</option>`).join('');
    $('#form').innerHTML = `<div class="card"><div class="card-h"><h3>Final answer</h3></div>
      <p class="muted sm">${max - res.attempts} of ${max} attempts left. Anyone on your team can submit.</p>
      <label class="field"><span>${icon('user', 14)} Suspect</span><select id="as">${opts(content.suspects)}</select></label>
      <label class="field"><span>${icon('weapon', 14)} Weapon</span><select id="aw">${opts(content.weapons)}</select></label>
      <label class="field"><span>${icon('pin', 14)} Location</span><select id="al">${opts(content.locations)}</select></label>
      <button class="btn lg block danger" id="sub">Submit answer</button>
      <p id="msg" class="b sm mt-2" style="color:var(--red)" role="status"></p></div>`;
    guard($('#sub'), async () => {
      const a = { suspect: $('#as').value, weapon: $('#aw').value, location: $('#al').value };
      if (attempts.some((x) => x.answer.suspect === a.suspect && x.answer.weapon === a.weapon && x.answer.location === a.location)) {
        $('#msg').textContent = 'Your team already tried that exact combination.'; return;
      }
      const { data, error } = await sb.rpc('submit_answer', { p_round: r.id, p_suspect: a.suspect, p_weapon: a.weapon, p_location: a.location });
      if (error) throw new Error(error.message);
      if (!data.solved) sfx.wrong();
      if (data.solved) { flash(me.name); toast(`Solved! +${data.score} points`); }
      else if (data.done) toast(`Out of attempts. ${data.score ? '+' + data.score + ' partial points.' : ''}`, true);
      else toast(`Not quite: ${data.correct_count} of 3 correct. ${data.attempts_left} attempt${data.attempts_left === 1 ? '' : 's'} left.`, true);
      await refresh(true);
    });
  }

  function drawLb() {
    $('#lb').innerHTML = leaderboardHtml(standings(st), me.id);
    $('#feed').innerHTML = feedHtml(st.feed);
    const rows = standings(st), pos = rows.findIndex((x) => x.team.id === me.id);
    $('#finale').innerHTML = st.game.status === 'finished'
      ? `<div class="card mb center"><div class="kicker">Game over</div><h2 style="margin:4px 0 6px">Final standings</h2>${podiumHtml(st)}
          <div class="dossier-cta"><div><b>${esc(me.name)}</b> finished <b>#${pos + 1}</b> with ${rows[pos]?.total ?? 0} points. Rank: <b>${rankFor(rows[pos]?.total ?? 0)}</b></div>
          <button class="btn" id="dos">🗂️ Download our case dossier</button></div></div>${awardsHtml(st) ? `<div class="card mb"><h3 class="mb">Awards</h3>${awardsHtml(st)}</div>` : ''}` : '';
    const dos = $('#dos');
    if (dos) dos.onclick = () => downloadDossier(st, me.id);
  }

  async function ensureContent() {
    const r = st.current, p = ph();
    if (r && (p === 'live' || p === 'closed') && contentFor !== r.id) {
      try { content = await loadContent(r.id); contentFor = content ? r.id : null; } catch { content = null; }
    }
    if (!r) { content = null; contentFor = null; }
  }

  function render() {
    const r = st.current, p = ph(), finished = st.game.status === 'finished';
    const showGame = !!r && (p === 'live' || p === 'closed');
    $('#game').classList.toggle('hidden', !showGame);
    $('#lobby').classList.toggle('hidden', finished || p === 'live');
    drawBanner();
    if (!finished && p !== 'live') drawLobby();
    drawLb();
    if (!showGame) { keys.puzzle = keys.form = ''; return; }
    drawPanel();
    const pk = [r.id, r.revealed && r.reveal ? 1 : 0, content ? 1 : 0, hints.length, p].join('|');
    const fk = [r.id, r.status, myResult().done, attempts.length, p, content ? 1 : 0, hints.length].join('|');
    if (pk !== keys.puzzle) {
      const nbChanged = !keys.puzzle || keys.puzzle.split('|')[0] !== String(r.id) || keys.puzzle.split('|')[2] !== (content ? '1' : '0');
      keys.puzzle = pk; drawCase();
      if (nbChanged) drawNotebook();                 // keep what's being typed when only hints/phase change
    }
    if (fk !== keys.form) { keys.form = fk; drawForm(); }
  }

  const bumpClock = (n) => { const el = document.querySelector('#game .cb-timer'); if (el) { el.dataset.plus = `+${n}s`; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } };
  async function refresh(force = false) {
    prev = st;
    st = await loadState(gameId);
    if (st.current) {
      const { data } = await sb.from('attempts').select('answer,correct_count').eq('round_id', st.current.id).eq('team_id', me.id).order('id');
      attempts = data || [];
      const hh = await sb.from('hints').select('kind,value').eq('round_id', st.current.id).eq('team_id', me.id).order('id');
      hints = hh.data || [];
    } else { attempts = []; hints = []; }
    await ensureContent();                       // always, so a missed load is retried
    const sig = JSON.stringify([st.game, st.teams, st.rounds, st.results, st.feed, attempts, hints, ph(), contentFor]);
    if (!force && sig === lastSig) return;
    lastSig = sig;
    const rr = st.current;
    if (rr && rr.revealed && rr.reveal && !seenReveal.has(rr.id)) { seenReveal.add(rr.id); revealCeremony(rr.reveal, rr.title); }
    crownOnce(st, { meTeamId: me.id, scope: 'team' });
    const extra = timeAdded(prev, st);
    if (extra > 0) { toast(`⏱️ The host added ${extra} seconds. Keep going!`); sfx.beep(true); bumpClock(extra); }
    newSolves(prev, st).forEach((n) => {
      if (n === me.name) return;
      const r = st.current, left = r ? (new Date(r.ends_at).getTime() - serverNow()) / 1000 : 0;
      toast(`${n} cracked the case! You still have ${fmtTime(left)}. Keep going.`);
    });
    render();
  }

  function tick() {
    const r = st.current, p = ph();
    if (p !== lastPh) {                      // phase flipped (e.g. countdown -> live): reload content and redraw
      const was = lastPh; lastPh = p;
      if (was) refresh(true).catch(() => {});
    }
    if (p === 'countdown') {
      const cd = r.settings.countdown ?? 15;
      showGetReady((new Date(r.started_at).getTime() - serverNow()) / 1000, cd, `${levelLabel(st, r)}: ${r.title}`);
    } else hideGetReady(p === 'live');
    document.body.classList.remove('tense');
    if (p !== 'live') return;
    if (contentFor !== r.id && Date.now() - lastRetry > 2000) { lastRetry = Date.now(); refresh(true).catch(() => {}); }
    const left = (new Date(r.ends_at).getTime() - serverNow()) / 1000;
    const total = Math.max(1, (new Date(r.ends_at) - new Date(r.started_at)) / 1000);
    setCaseViewTime($('#game'), left, total);
    document.body.classList.toggle('tense', left <= 30 && left > 0 && !myResult()?.done);
    const sec = Math.ceil(left);
    if (sec !== lastSec) { lastSec = sec; if (sec <= 10 && sec > 0 && !myResult()?.done) sfx.tick(); }
    if (left <= 0 && !closing) {
      closing = true;
      sb.rpc('close_expired', { p_round: r.id }).then(() => refresh(true)).finally(() => (closing = false));
    }
  }
  const timer = setInterval(tick, 250);

  lastPh = ph();
  await refresh(true);
  const unsub = subscribe(gameId, () => refresh().catch(() => {}));
  return () => { clearInterval(timer); unsub(); hideGetReady(); document.body.classList.remove('tense'); };
}
