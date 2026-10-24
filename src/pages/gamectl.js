import { sb, syncClock, serverNow } from '../supabase.js';
import { esc, topbar, $, $$, guard, toast, joinUrl, copyText, download, fmtTime, flash } from '../ui.js';
import { requireAdmin } from './_auth.js';
import { loadState, standings, subscribe, newSolves } from '../data.js';

const FIELDS = [
  ['base', 'Points for a correct answer', 0, 10000],
  ['bonus', 'Maximum speed bonus', 0, 10000],
  ['penalty', 'Penalty per wrong attempt', 0, 10000],
  ['max_attempts', 'Attempts per team', 1, 20],
  ['partial', 'Partial points per correct item', 0, 1000],
  ['timer', 'Round time (seconds)', 10, 7200],
];

export async function mount(app, [gameId]) {
  const user = await requireAdmin(app);
  if (!user) return;
  await syncClock();

  let st = await loadState(gameId);
  if (st.game.host_id !== user.id) throw new Error('You are not the host of this game.');
  let puzzles = [];
  let secret = null;       // host-only answer for the current round
  let secretFor = null;
  let chosen = '';
  let prev = st;
  let closing = false;

  const { data: pz } = await sb.from('puzzles').select('id,title,slug').eq('owner_id', user.id).order('created_at');
  puzzles = pz || [];

  app.innerHTML = topbar(`<a class="btn s o" style="color:#f5efdc;text-decoration:none" href="#/admin">All games</a>`) + `
    <main>
      <div id="hdr"></div>
      <div class="split"><div id="round"></div><div id="settings"></div></div>
      <div id="teams"></div>
      <div id="board"></div>
    </main>`;

  // ---------- header + join link ----------
  function drawHdr() {
    const g = st.game, url = joinUrl(g.join_code);
    $('#hdr').innerHTML = `
      <h1>${esc(g.title)} <span class="pill ${g.status === 'active' ? 'live' : g.status === 'finished' ? 'done' : 'lobby'}" style="font-size:14px;vertical-align:middle">${g.status}</span></h1>
      <div class="card"><h3>Invite teams</h3>
        <p class="mut">Send this link to your teams. Anyone who opens it can create a team and play from their own phone.</p>
        <span class="code" id="jl">${esc(url)}</span>
        <p><button class="btn" id="cp">Copy join link</button>
        <a class="btn o" style="display:inline-block;text-decoration:none" href="#/board/${g.id}" target="_blank" rel="noopener">Open projector view</a>
        ${g.status !== 'finished' ? '<button class="btn r" id="fin">Finish game</button>' : ''}</p></div>`;
    $('#cp').onclick = () => copyText(url);
    guard($('#fin'), async () => {
      if (!confirm('Finish the game? Teams will no longer be able to join or answer.')) return;
      const { error } = await sb.rpc('finish_game', { p_game: gameId });
      if (error) throw new Error(error.message);
      await refresh();
    });
  }

  // ---------- settings (drawn once; not redrawn on refresh so typing isn't lost) ----------
  function drawSettings() {
    const s = st.game.settings;
    $('#settings').innerHTML = `<div class="card"><h3>Scoring</h3>
      <div class="grid">${FIELDS.map(([k, l, min, max]) =>
        `<label>${l}<input type="number" data-k="${k}" min="${min}" max="${max}" step="1" value="${esc(s[k])}"></label>`).join('')}
      <label><span><input type="checkbox" id="up"${s.use_partial ? ' checked' : ''}> Give partial credit when attempts or time run out</span></label></div>
      <p class="mut">Score = correct points + speed bonus − penalties. Changes apply from the next round you start.</p>
      <button class="btn" id="sv">Save scoring</button></div>`;
    guard($('#sv'), async () => {
      const n = { use_partial: $('#up').checked };
      for (const [k, l, min, max] of FIELDS) {
        const v = Number($(`[data-k="${k}"]`).value);
        if (!Number.isInteger(v) || v < min || v > max) throw new Error(`${l} must be a whole number from ${min} to ${max}.`);
        n[k] = v;
      }
      const { error } = await sb.from('games').update({ settings: n }).eq('id', gameId);
      if (error) throw new Error(error.message);
      toast('Scoring saved'); await refresh();
    });
  }

  // ---------- round control ----------
  async function loadSecret() {
    if (!st.current || secretFor === st.current.id) return;
    secretFor = st.current.id;
    const { data } = await sb.from('round_secrets').select('solution,explanation').eq('round_id', st.current.id).maybeSingle();
    secret = data;
  }

  function drawRound() {
    const g = st.game, cur = st.current;
    const played = new Set(st.rounds.map((r) => r.puzzle_id).filter(Boolean));
    const avail = puzzles.filter((p) => !played.has(p.id));
    if (!avail.some((p) => p.id === chosen)) chosen = '';
    const live = cur && cur.status === 'live';
    const doneCount = cur ? st.results.filter((r) => r.round_id === cur.id && r.done).length : 0;

    let h = '<div class="card"><h3>Round control</h3>';
    if (cur) {
      h += `<p><b>Round ${cur.round_no}: ${esc(cur.content.title)}</b> <span class="pill ${live ? 'live' : 'done'}">${live ? 'LIVE' : 'closed'}</span></p>`;
      if (live) h += `<div class="timer" id="gt">–:––</div>`;
      h += `<p class="mut">${doneCount} of ${st.teams.length} teams finished.</p>`;
      if (secret) h += `<p class="note"><b>Answer (host only):</b> ${esc(secret.solution.suspect)} · ${esc(secret.solution.weapon)} · ${esc(secret.solution.location)}</p>`;
      h += '<p>';
      if (live) h += '<button class="btn r" id="stop">Stop round</button> ';
      if (!cur.revealed) h += '<button class="btn k" id="rev">Reveal answer to teams</button>';
      else h += '<span class="ok">Answer revealed to teams.</span>';
      h += '</p><hr>';
    }
    if (g.status === 'finished') h += '<p class="mut">This game is finished.</p>';
    else if (!puzzles.length) h += '<p>Your puzzle library is empty. <a href="#/admin">Add puzzles</a> first.</p>';
    else if (!avail.length) h += '<p class="mut">Every puzzle in your library has been played. <a href="#/admin">Add more</a> or finish the game.</p>';
    else h += `<label>Next puzzle<select id="sel"><option value="">Choose a puzzle</option>${avail.map((p) =>
        `<option value="${p.id}"${p.id === chosen ? ' selected' : ''}>${esc(p.title)}</option>`).join('')}</select></label>
      <p><button class="btn" id="start">${live ? 'End current round and start this one' : 'Start round'}</button></p>
      ${!st.teams.length ? '<p class="mut">No teams have joined yet. You can still start, but late joiners will miss the first minutes.</p>' : ''}`;
    $('#round').innerHTML = h + '</div>';

    const sel = $('#sel'); if (sel) sel.onchange = () => (chosen = sel.value);
    guard($('#start'), async () => {
      if (!chosen) throw new Error('Choose a puzzle first.');
      if (live && !confirm('Start a new round now? The current round will be closed.')) return;
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
  }

  // ---------- teams ----------
  function drawTeams() {
    $('#teams').innerHTML = `<div class="card" style="padding:0"><div class="row"><h3 style="margin:0">Teams (${st.teams.length})</h3></div>
      ${st.teams.length ? st.teams.map((t) => `<div class="row"><div class="grow"><b>${esc(t.name)}</b><br>
        <span class="mut">${esc(t.team_members.map((m) => m.player_name).join(', '))}</span></div>
        <button class="btn s r" data-del="${t.id}" data-name="${esc(t.name)}">Remove</button></div>`).join('')
        : '<div class="row mut">Waiting for teams. Share the join link above.</div>'}</div>`;
    $$('[data-del]').forEach((b) => guard(b, async () => {
      if (!confirm(`Remove team "${b.dataset.name}" and all of its scores?`)) return;
      const { error } = await sb.from('teams').delete().eq('id', b.dataset.del);
      if (error) throw new Error(error.message);
      await refresh();
    }));
  }

  // ---------- scoreboard ----------
  function drawBoard() {
    const rows = standings(st);
    $('#board').innerHTML = `<div class="card" style="padding:0;overflow-x:auto"><div class="row"><h3 style="margin:0" class="grow">Scoreboard</h3>
      <button class="btn s o" id="csv"${rows.length ? '' : ' disabled'}>Export CSV</button></div>
      <table class="data"><thead><tr><th>#</th><th>Team</th>${st.rounds.map((r) => `<th title="${esc(r.content.title)}">R${r.round_no}</th>`).join('')}<th>Total</th></tr></thead>
      <tbody>${rows.map((x, i) => `<tr><td>${i + 1}</td><td><b>${esc(x.team.name)}</b></td>${st.rounds.map((r) => {
        const v = x.byRound[r.id];
        return `<td>${v ? `${v.score}${v.solved ? ' ✓' : v.done ? '' : '…'}` : '–'}</td>`;
      }).join('')}<td><b>${x.total}</b></td></tr>`).join('') || `<tr><td colspan="${3 + st.rounds.length}" class="mut">No teams yet.</td></tr>`}</tbody></table></div>`;
    const csv = $('#csv');
    if (csv) csv.onclick = () => {
      const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
      const head = ['Rank', 'Team', 'Players', ...st.rounds.map((r) => `R${r.round_no} ${r.content.title}`), 'Total'];
      const lines = rows.map((x, i) => [i + 1, x.team.name, x.team.team_members.map((m) => m.player_name).join('; '),
        ...st.rounds.map((r) => x.byRound[r.id]?.score ?? 0), x.total].map(q).join(','));
      download(`${st.game.title.replace(/[^\w]+/g, '-')}-scores.csv`, [head.map(q).join(','), ...lines].join('\n'), 'text/csv');
    };
  }

  const sig = (x) => JSON.stringify([x.game, x.teams, x.rounds, x.results]);
  async function refresh(force = true) {
    prev = st;
    st = await loadState(gameId);
    if (!force && sig(prev) === sig(st)) return;   // nothing changed: don't redraw (keeps dropdowns open)
    newSolves(prev, st).slice(0, 1).forEach(flash);
    await loadSecret();
    drawHdr(); drawRound(); drawTeams(); drawBoard();
  }

  // countdown (server-clock based)
  const timer = setInterval(async () => {
    const el = $('#gt'), cur = st.current;
    if (!el || !cur || cur.status !== 'live') return;
    const left = (new Date(cur.ends_at).getTime() - serverNow()) / 1000;
    el.textContent = '⏱ ' + fmtTime(left);
    el.classList.toggle('low', left <= 30);
    if (left <= 0 && !closing) {
      closing = true;
      try { await sb.rpc('close_expired', { p_round: cur.id }); await refresh(); } finally { closing = false; }
    }
  }, 500);

  await loadSecret();
  drawHdr(); drawSettings(); drawRound(); drawTeams(); drawBoard();
  const unsub = subscribe(gameId, () => refresh(false).catch(() => {}));
  return () => { clearInterval(timer); unsub(); };
}
