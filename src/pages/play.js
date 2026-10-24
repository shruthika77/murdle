import { sb, whoAmI, syncClock, serverNow } from '../supabase.js';
import { esc, topbar, $, $$, guard, toast, fmtTime, flash, copyText } from '../ui.js';
import { loadState, standings, subscribe, newSolves, leaderboardHtml } from '../data.js';
import { puzzleCardHtml } from '../puzzles.js';

const blank = () => [Array(9).fill(''), Array(9).fill(''), Array(9).fill('')];

export async function mount(app, [gameId]) {
  const { user, role } = await whoAmI();
  const notJoined = (extra = '') => {
    app.innerHTML = topbar() + `<main><div class="card"><h2>You're not on a team yet</h2>
      <p>Open the join link your host sent you to create a team or join one. ${extra}</p></div></main>`;
  };
  if (!user || role === 'admin') {
    if (role === 'admin') { location.hash = '#/board/' + gameId; return; }
    return notJoined();
  }
  await syncClock();

  let st;
  try { st = await loadState(gameId); } catch { return notJoined(); }
  const me = st.teams.find((t) => t.team_members.some((m) => m.user_id === user.id));
  if (!me) return notJoined();
  localStorage.setItem('cc_game', gameId);
  const { data: sec } = await sb.from('team_secrets').select('code').eq('team_id', me.id).maybeSingle();

  let prev = st, attempts = [], closing = false, lastSig = '';
  let keys = { puzzle: '', form: '' };

  app.innerHTML = topbar() + `<main>
    <div class="card"><div class="inline" style="align-items:center">
      <div><h2 style="margin:0">${esc(me.name)}</h2><span class="mut" id="mates"></span></div>
      <div style="flex:0 0 auto;text-align:right"><span class="mut">Team code for teammates</span><br>
        <b id="tc" style="font:26px var(--head);letter-spacing:.12em">${esc(sec?.code || '')}</b>
        <button class="btn s o" id="ctc" aria-label="Copy team code">Copy</button></div></div></div>
    <div id="state"></div>
    <div id="status"></div><div id="puzzle"></div><div id="grid"></div><div id="form"></div>
    <div class="card" style="padding:0"><div class="row"><h3 style="margin:0">Leaderboard</h3></div><div id="lb"></div></div>
  </main>`;
  $('#ctc').onclick = () => copyText(sec?.code || '');

  const myResult = () => st.current
    ? st.results.find((r) => r.round_id === st.current.id && r.team_id === me.id) || { attempts: 0, done: false, solved: false, score: 0 }
    : null;
  const roundOver = () => !st.current || st.current.status !== 'live' || st.game.status === 'finished';

  // ---------- deduction grid (saved on this device) ----------
  const gridKey = () => `cc-grid:${st.current.id}:${me.id}`;
  const loadGrid = () => { try { return JSON.parse(localStorage.getItem(gridKey())) || blank(); } catch { return blank(); } };
  function drawGrid() {
    const c = st.current.content, gr = loadGrid();
    const table = (g, rows, cols) => `<table class="grid-t"><tr><th></th>${cols.map((x) => `<th>${esc(x.name)}</th>`).join('')}</tr>${rows.map((r, i) =>
      `<tr><th>${esc(r.name)}</th>${[0, 1, 2].map((j) => {
        const v = gr[g][i * 3 + j];
        return `<td><button data-g="${g}" data-i="${i}" data-j="${j}" class="${v === '✗' ? 'x' : v ? 'v' : ''}"
          aria-label="${esc(r.name)} and ${esc(cols[j].name)}: ${v === '✗' ? 'ruled out' : v ? 'confirmed' : 'unknown'}">${v}</button></td>`;
      }).join('')}</tr>`).join('')}</table>`;
    $('#grid').innerHTML = `<div class="card"><h3>Deduction grid</h3>
      <p class="mut">Tap a cell to cycle: blank → ✗ (ruled out) → ✓ (confirmed). Saved on this device.</p>
      <div class="gwrap">${table(0, c.suspects, c.weapons)}${table(1, c.suspects, c.locations)}${table(2, c.weapons, c.locations)}</div>
      <button class="btn s o" id="clr">Clear grid</button></div>`;
    $$('#grid td button').forEach((b) => (b.onclick = () => {
      const g = +b.dataset.g, k = +b.dataset.i * 3 + +b.dataset.j, d = loadGrid();
      d[g][k] = d[g][k] === '' ? '✗' : d[g][k] === '✗' ? '✓' : '';
      try { localStorage.setItem(gridKey(), JSON.stringify(d)); } catch { /* storage full or blocked */ }
      drawGrid();
      const nb = $(`#grid [data-g="${g}"][data-i="${b.dataset.i}"][data-j="${b.dataset.j}"]`); if (nb) nb.focus();
    }));
    $('#clr').onclick = () => { if (confirm('Clear your grid?')) { localStorage.removeItem(gridKey()); drawGrid(); } };
  }

  // ---------- puzzle card (+ answer after reveal) ----------
  function drawPuzzle() {
    const r = st.current;
    $('#puzzle').innerHTML = `<div class="card">${puzzleCardHtml(r.content, esc)}
      ${r.revealed && r.reveal ? `<div class="note"><p class="ok">Answer: ${esc(r.reveal.solution.suspect)} with the
        ${esc(r.reveal.solution.weapon)} in the ${esc(r.reveal.solution.location)}</p><p>${esc(r.reveal.explanation || '')}</p></div>` : ''}</div>`;
  }

  // ---------- answer form ----------
  function drawForm() {
    const r = st.current, res = myResult();
    if (roundOver() || res.done) { $('#form').innerHTML = ''; return; }
    const c = r.content, max = r.settings.max_attempts;
    const opts = (a) => a.map((x) => `<option>${esc(x.name)}</option>`).join('');
    $('#form').innerHTML = `<div class="card"><h3>Final answer</h3>
      <p class="mut">Your team has ${max - res.attempts} of ${max} attempts left. Anyone on your team can submit.</p>
      <div class="grid"><label>Suspect<select id="as">${opts(c.suspects)}</select></label>
      <label>Weapon<select id="aw">${opts(c.weapons)}</select></label>
      <label>Location<select id="al">${opts(c.locations)}</select></label></div>
      <p><button class="btn r" id="sub">Submit answer</button></p><p id="msg" class="err" role="status"></p></div>`;
    guard($('#sub'), async () => {
      const a = { suspect: $('#as').value, weapon: $('#aw').value, location: $('#al').value };
      if (attempts.some((x) => x.answer.suspect === a.suspect && x.answer.weapon === a.weapon && x.answer.location === a.location)) {
        $('#msg').textContent = 'Your team already tried that exact combination.'; return;
      }
      const { data, error } = await sb.rpc('submit_answer', { p_round: r.id, p_suspect: a.suspect, p_weapon: a.weapon, p_location: a.location });
      if (error) throw new Error(error.message);
      if (data.solved) { flash(me.name); toast(`Solved! +${data.score} points`); }
      else if (data.done) toast(`Out of attempts. ${data.score ? '+' + data.score + ' partial points.' : ''}`, true);
      else toast(`Not quite: ${data.correct_count} of 3 correct. ${data.attempts_left} attempt${data.attempts_left === 1 ? '' : 's'} left.`, true);
      await refresh(true);
    });
  }

  // ---------- status strip (cheap, redrawn on every update) ----------
  function drawStatus() {
    const g = st.game, r = st.current, res = myResult();
    if (g.status === 'finished') { $('#state').innerHTML = '<div class="card"><h2>Game over</h2><p>Thanks for playing. Final standings are below.</p></div>'; }
    else $('#state').innerHTML = '';
    if (!r) { $('#status').innerHTML = `<div class="card"><h3>Waiting for the host</h3><p class="mut">The next case appears here the moment the host starts a round. Keep this page open.</p></div>`; return; }
    const hist = attempts.length ? `<ul class="hist">${attempts.map((a, i) =>
      `<li>Try ${i + 1}: ${esc(a.answer.suspect)} · ${esc(a.answer.weapon)} · ${esc(a.answer.location)} → ${a.correct_count} of 3 right</li>`).join('')}</ul>` : '';
    $('#status').innerHTML = `<div class="card">
      <div class="inline" style="align-items:center"><div><b>Round ${r.round_no}: ${esc(r.content.title)}</b></div>
        ${r.status === 'live' ? '<div class="timer" id="tm" style="flex:0 0 auto"></div>' : '<span class="pill done" style="flex:0 0 auto">round closed</span>'}</div>
      <p>Attempts: <b>${res.attempts}/${r.settings.max_attempts}</b>
        ${res.solved ? `<span class="ok">Solved! +${res.score}</span>` : res.done ? `<span class="err">Finished. ${res.score} points</span>` : ''}</p>${hist}</div>`;
    tick();
  }

  function drawLb() { $('#lb').innerHTML = leaderboardHtml(standings(st)); }
  function drawMates() { $('#mates').textContent = st.teams.find((t) => t.id === me.id)?.team_members.map((m) => m.player_name).join(', ') || ''; }

  async function refresh(force = false) {
    prev = st;
    st = await loadState(gameId);
    if (st.current) {
      const { data } = await sb.from('attempts').select('answer,correct_count').eq('round_id', st.current.id).eq('team_id', me.id).order('id');
      attempts = data || [];
    } else attempts = [];
    const sig = JSON.stringify([st.game, st.teams, st.rounds, st.results, attempts]);
    if (!force && sig === lastSig) return;
    lastSig = sig;
    newSolves(prev, st).slice(0, 1).forEach((n) => { if (n !== me.name) flash(n); });

    const r = st.current, res = myResult();
    const pk = r ? r.id + '|' + r.revealed : '';
    const fk = r ? [r.id, r.status, res.done, attempts.length, st.game.status].join('|') : '';
    drawMates(); drawStatus(); drawLb();
    if (pk !== keys.puzzle) { keys.puzzle = pk; if (r) { drawPuzzle(); drawGrid(); } else { $('#puzzle').innerHTML = ''; $('#grid').innerHTML = ''; } }
    if (fk !== keys.form) { keys.form = fk; if (r) drawForm(); else $('#form').innerHTML = ''; }
  }

  function tick() {
    const el = $('#tm'), r = st.current;
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
  return () => { clearInterval(timer); unsub(); };
}
