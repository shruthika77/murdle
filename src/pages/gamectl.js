import { sb, syncClock, serverNow } from '../supabase.js';
import { esc, topbar, $, $$, guard, toast, joinUrl, copyText, download, fmtTime, flash, icon, statusBadge, badge } from '../ui.js';
import { requireAdmin } from './_auth.js';
import { loadState, standings, subscribe, newSolves, phase, rosterHtml, counts } from '../data.js';

const FIELDS = [
  ['countdown', 'Get-ready countdown (seconds)', 0, 120],
  ['timer', 'Round time (seconds)', 10, 7200],
  ['base', 'Points for a correct answer', 0, 10000],
  ['bonus', 'Maximum speed bonus', 0, 10000],
  ['penalty', 'Penalty per wrong attempt', 0, 10000],
  ['max_attempts', 'Attempts per team', 1, 20],
  ['partial', 'Partial points per correct item', 0, 1000],
];
const DEFAULTS = { countdown: 15, timer: 300, base: 100, bonus: 50, penalty: 10, max_attempts: 3, partial: 10, use_partial: true };

export async function mount(app, [gameId]) {
  const user = await requireAdmin(app);
  if (!user) return;
  await syncClock();

  let st = await loadState(gameId);
  if (st.game.host_id !== user.id) throw new Error('You are not the host of this game.');
  let secret = null, secretFor = null, chosen = '', prev = st, closing = false;
  const { data: pz } = await sb.from('puzzles').select('id,title').eq('owner_id', user.id).order('created_at');
  const puzzles = pz || [];

  app.innerHTML = topbar(`<a class="btn sm sec" href="#/admin">${icon('flag', 15)} All games</a>`) + `
    <main class="wrap"><div id="hdr"></div>
      <div class="cols"><div class="stack"><div id="round"></div><div id="board"></div></div>
        <div class="stack side"><div id="invite"></div><div id="settings"></div></div></div></main>`;

  const cfg = () => ({ ...DEFAULTS, ...st.game.settings });

  function drawHdr() {
    const g = st.game;
    $('#hdr').innerHTML = `<div class="page-h"><div><div class="eyebrow">Game console</div>
      <div class="flex wrapf"><h1 style="font-size:34px">${esc(g.title)}</h1>${statusBadge(g.status)}</div></div>
      <div class="flex wrapf"><a class="btn sec" href="#/board/${g.id}" target="_blank" rel="noopener">${icon('monitor', 16)} Projector view</a>
      ${g.status !== 'finished' ? `<button class="btn danger" id="fin">${icon('flag', 16)} Finish game</button>` : ''}</div></div>`;
    guard($('#fin'), async () => {
      if (!confirm('Finish the game? Teams will no longer be able to join or answer.')) return;
      const { error } = await sb.rpc('finish_game', { p_game: gameId });
      if (error) throw new Error(error.message);
      await refresh();
    });
  }

  function drawInvite() {
    const url = joinUrl(st.game.join_code);
    $('#invite').innerHTML = `<div class="card"><div class="card-h"><h3>${icon('link', 17)} Invite teams</h3></div>
      <p class="muted sm">Share this link. Anyone who opens it can create a team and play from their own phone.</p>
      <div class="code-box"><span class="grow">${esc(url)}</span></div>
      <button class="btn block mt-2" id="cp">${icon('copy', 16)} Copy join link</button></div>`;
    $('#cp').onclick = () => copyText(url);
  }

  function drawSettings() {
    const s = cfg();
    $('#settings').innerHTML = `<div class="card"><div class="card-h"><h3>${icon('settings', 17)} Rules and scoring</h3></div>
      <div class="settings">${FIELDS.map(([k, l, min, max]) =>
        `<label class="field"><span>${l}</span><input type="number" data-k="${k}" min="${min}" max="${max}" step="1" value="${esc(s[k])}"></label>`).join('')}</div>
      <label class="check"><input type="checkbox" id="up"${s.use_partial ? ' checked' : ''}><span>Give partial credit when attempts or time run out</span></label>
      <p class="muted sm mt-2">Score = correct points + speed bonus − penalties. Changes apply from the next round you start.</p>
      <button class="btn block mt-2" id="sv">Save settings</button></div>`;
    guard($('#sv'), async () => {
      const n = { use_partial: $('#up').checked };
      for (const [k, l, min, max] of FIELDS) {
        const v = Number($(`[data-k="${k}"]`).value);
        if (!Number.isInteger(v) || v < min || v > max) throw new Error(`${l} must be a whole number from ${min} to ${max}.`);
        n[k] = v;
      }
      const { error } = await sb.from('games').update({ settings: n }).eq('id', gameId);
      if (error) throw new Error(error.message);
      toast('Settings saved'); await refresh();
    });
  }

  async function loadSecret() {
    if (!st.current || secretFor === st.current.id) return;
    secretFor = st.current.id;
    const { data } = await sb.from('round_secrets').select('solution,explanation').eq('round_id', st.current.id).maybeSingle();
    secret = data;
  }

  function drawRound() {
    const g = st.game, cur = st.current, ph = phase(cur, serverNow());
    const c = counts(st), s = cfg();
    const played = new Set(st.rounds.map((r) => r.puzzle_id).filter(Boolean));
    const avail = puzzles.filter((p) => !played.has(p.id));
    if (!avail.some((p) => p.id === chosen)) chosen = '';
    const running = ph === 'countdown' || ph === 'live';
    const doneCount = cur ? st.results.filter((r) => r.round_id === cur.id && r.done).length : 0;

    let h = `<div class="card"><div class="card-h"><h3>${icon('play', 17)} Round control</h3>
      ${ph === 'live' ? badge('live', 'Round ' + cur.round_no + ' live') : ph === 'countdown' ? badge('warn', 'Countdown') : ''}</div>`;

    if (ph === 'countdown') {
      h += `<div class="callout warn flex wrapf"><div class="grow"><div class="b">Round ${cur.round_no} starts in <span id="cd" style="font-size:22px">…</span> s</div>
        <div class="sm">${esc(cur.title)}. Every team sees the get-ready countdown. The puzzle opens when it reaches zero.</div></div>
        <button class="btn danger sm" id="stop">Cancel</button></div>`;
    } else if (ph === 'live') {
      h += `<div class="flex wrapf"><div class="grow"><div class="b">Round ${cur.round_no}: ${esc(cur.title)}</div>
        <div class="muted sm">${doneCount} of ${c.teams} teams finished</div></div>
        <div class="timer-box"><div class="time" id="gt" style="font-size:40px">–:––</div></div></div>
        <div class="bar"><i id="gb" style="width:100%"></i></div>`;
    } else if (cur) {
      h += `<div class="b">Round ${cur.round_no}: ${esc(cur.title)} <span class="badge ok">Closed</span></div>`;
    }
    if (cur && secret && ph !== 'cancelled') {
      h += `<div class="callout brand mt-2"><b>Answer (host only):</b> ${esc(secret.solution.suspect)} · ${esc(secret.solution.weapon)} · ${esc(secret.solution.location)}</div>`;
    }
    if (cur && ph !== 'cancelled') {
      h += `<div class="flex wrapf mt-2">${ph === 'live' ? `<button class="btn danger sm" id="stop">${icon('stop', 14)} Stop round</button>` : ''}
        ${!cur.revealed ? `<button class="btn sec sm" id="rev">${icon('eye', 14)} Reveal answer to teams</button>` : '<span class="badge ok">Answer revealed</span>'}</div>`;
    }

    h += `<hr style="border:0;border-top:1px solid var(--line);margin:18px 0">`;
    if (g.status === 'finished') h += '<p class="muted">This game is finished.</p>';
    else if (!puzzles.length) h += '<div class="callout warn">Your puzzle library is empty. <a href="#/admin">Add puzzles</a> first.</div>';
    else if (!avail.length) h += '<p class="muted">Every puzzle in your library has been played. <a href="#/admin">Add more</a> or finish the game.</p>';
    else {
      h += `<div class="flex wrapf between mb"><div><div class="b">${running ? 'Next round' : 'Waiting room'}</div>
        <div class="muted sm">${c.teams} team${c.teams === 1 ? '' : 's'} · ${c.players} player${c.players === 1 ? '' : 's'} · <b style="color:var(--ok)">${c.ready} ready</b></div></div>
        ${!running && c.players ? '<span class="pulse-dot" title="Live"></span>' : ''}</div>
        <label class="field"><span>Choose the puzzle</span><select id="sel"><option value="">Select a puzzle</option>${avail.map((p) =>
          `<option value="${p.id}"${p.id === chosen ? ' selected' : ''}>${esc(p.title)}</option>`).join('')}</select></label>
        <button class="btn lg block" id="start">${icon('play', 16)} ${running ? 'End current round and start this one' : 'Start round'}</button>
        <p class="muted sm center mt-2">${s.countdown ? `A ${s.countdown}-second countdown runs on every screen, then` : 'Immediately,'} the ${fmtTime(s.timer)} clock starts.</p>`;
    }
    h += '</div>';

    // waiting room roster (host view, with remove)
    h += `<div class="card mt"><div class="card-h"><h3>${icon('users', 17)} Teams</h3><span class="muted sm">Updates live</span></div>
      ${rosterHtml(st, { remove: true })}</div>`;
    $('#round').innerHTML = h;

    const sel = $('#sel'); if (sel) sel.onchange = () => (chosen = sel.value);
    guard($('#start'), async () => {
      if (!chosen) throw new Error('Choose a puzzle first.');
      if (!c.players && !confirm('No players have joined yet. Start anyway?')) return;
      if (running && !confirm('Start a new round now? The current round will be closed.')) return;
      const { error } = await sb.rpc('start_round', { p_game: gameId, p_puzzle: chosen });
      if (error) throw new Error(error.message);
      chosen = ''; await refresh();
    });
    guard($('#stop'), async () => {
      const { error } = await sb.rpc('stop_round', { p_round: cur.id });
      if (error) throw new Error(error.message);
      await refresh();
    });
    guard($('#rev'), async () => {
      const { error } = await sb.rpc('reveal_round', { p_round: cur.id });
      if (error) throw new Error(error.message);
      await refresh();
    });
    $$('[data-del]').forEach((b) => guard(b, async () => {
      if (!confirm(`Remove team "${b.dataset.name}" and all of its scores?`)) return;
      const { error } = await sb.from('teams').delete().eq('id', b.dataset.del);
      if (error) throw new Error(error.message);
      await refresh();
    }));
  }

  function drawBoard() {
    const rows = standings(st);
    $('#board').innerHTML = `<div class="card flush"><div class="card-h"><h3>${icon('trophy', 17)} Scoreboard</h3>
      <button class="btn sm sec" id="csv"${rows.length ? '' : ' disabled'}>${icon('download', 15)} Export CSV</button></div>
      <div class="tw"><table class="data"><thead><tr><th>#</th><th>Team</th>${st.rounds.map((r) => `<th title="${esc(r.title)}">R${r.round_no}</th>`).join('')}<th class="num">Total</th></tr></thead>
      <tbody>${rows.map((x, i) => `<tr><td>${i + 1}</td><td class="b">${esc(x.team.name)}</td>${st.rounds.map((r) => {
        const v = x.byRound[r.id];
        return `<td>${v ? `${v.score}${v.solved ? ' ✓' : v.done ? '' : ' …'}` : '–'}</td>`;
      }).join('')}<td class="num b">${x.total}</td></tr>`).join('') || `<tr><td colspan="${3 + st.rounds.length}" class="muted">No teams yet.</td></tr>`}</tbody></table></div></div>`;
    const csv = $('#csv');
    if (csv) csv.onclick = () => {
      const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
      const head = ['Rank', 'Team', 'Players', ...st.rounds.map((r) => `R${r.round_no} ${r.title}`), 'Total'];
      const lines = rows.map((x, i) => [i + 1, x.team.name, x.team.team_members.map((m) => m.player_name).join('; '),
        ...st.rounds.map((r) => x.byRound[r.id]?.score ?? 0), x.total].map(q).join(','));
      download(`${st.game.title.replace(/[^\w]+/g, '-')}-scores.csv`, [head.map(q).join(','), ...lines].join('\n'), 'text/csv');
    };
  }

  const sig = (x) => JSON.stringify([x.game, x.teams, x.rounds, x.results]);
  async function refresh(force = true) {
    prev = st;
    st = await loadState(gameId);
    if (!force && sig(prev) === sig(st)) return;
    newSolves(prev, st).slice(0, 1).forEach(flash);
    await loadSecret();
    drawHdr(); drawInvite(); drawRound(); drawBoard();
  }

  let lastPh = '';
  const timer = setInterval(async () => {
    const cur = st.current, ph = phase(cur, serverNow());
    if (ph !== lastPh) { lastPh = ph; if (cur) drawRound(); }          // countdown -> live flips the panel
    if (!cur) return;
    if (ph === 'countdown') {
      const el = $('#cd'); if (el) el.textContent = Math.max(0, Math.ceil((new Date(cur.started_at).getTime() - serverNow()) / 1000));
    } else if (ph === 'live') {
      const left = (new Date(cur.ends_at).getTime() - serverNow()) / 1000;
      const total = Math.max(1, (new Date(cur.ends_at) - new Date(cur.started_at)) / 1000);
      const el = $('#gt'), bar = $('#gb');
      if (el) { el.textContent = fmtTime(left); el.classList.toggle('low', left <= 30); }
      if (bar) { bar.style.width = Math.max(0, Math.min(100, (left / total) * 100)) + '%'; bar.classList.toggle('low', left <= 30); }
      if (left <= 0 && !closing) {
        closing = true;
        try { await sb.rpc('close_expired', { p_round: cur.id }); await refresh(); } finally { closing = false; }
      }
    }
  }, 250);

  await loadSecret();
  lastPh = phase(st.current, serverNow());
  drawHdr(); drawInvite(); drawSettings(); drawRound(); drawBoard();
  const unsub = subscribe(gameId, () => refresh(false).catch(() => {}));
  return () => { clearInterval(timer); unsub(); };
}
