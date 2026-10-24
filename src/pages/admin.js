import { sb } from '../supabase.js';
import { esc, topbar, $, $$, guard, toast, joinUrl, copyText, download } from '../ui.js';
import { requireAdmin } from './_auth.js';
import { importPuzzles, puzzleCardHtml } from '../puzzles.js';
import { SAMPLES } from '../samples.js';

export async function mount(app) {
  const user = await requireAdmin(app);
  if (!user) return;

  let tab = 'games';
  let games = [];
  let puzzles = [];
  let open = new Set();

  async function refresh() {
    const [g, p] = await Promise.all([
      sb.from('games').select('id,title,status,join_code,created_at').eq('host_id', user.id).order('created_at', { ascending: false }),
      sb.from('puzzles').select('id,slug,title,content,solution,explanation').eq('owner_id', user.id).order('created_at'),
    ]);
    if (g.error) throw new Error(g.error.message);
    if (p.error) throw new Error(p.error.message);
    games = g.data; puzzles = p.data;
    draw();
  }

  function draw() {
    app.innerHTML = topbar(`<span class="who">${esc(user.email)}</span><button class="btn s o" id="out" style="color:#f5efdc">Sign out</button>`) + `
      <main><h1>Host dashboard</h1>
      <div class="tabs" role="tablist">
        <button role="tab" data-tab="games" aria-selected="${tab === 'games'}">Games (${games.length})</button>
        <button role="tab" data-tab="puzzles" aria-selected="${tab === 'puzzles'}">Puzzle library (${puzzles.length})</button>
      </div><div id="pane"></div></main>`;
    guard($('#out'), async () => { await sb.auth.signOut(); location.hash = '#/'; });
    $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
    tab === 'games' ? drawGames() : drawPuzzles();
  }

  function drawGames() {
    $('#pane').innerHTML = `
      <div class="card"><h3>New game</h3>
        <form id="ng" class="inline"><label>Game name<input id="gt" maxlength="80" required placeholder="Friday office mystery night"></label>
        <button class="btn" type="submit">Create game</button></form></div>
      <div class="card" style="padding:0">${games.length ? games.map((g) => `
        <div class="row"><div class="grow"><b>${esc(g.title)}</b>
          <span class="pill ${g.status === 'active' ? 'live' : g.status === 'finished' ? 'done' : 'lobby'}">${g.status}</span><br>
          <span class="mut">${new Date(g.created_at).toLocaleString()}</span></div>
          <button class="btn s o" data-copy="${esc(g.join_code)}">Copy join link</button>
          <a class="btn s" style="text-decoration:none;display:inline-flex;align-items:center" href="#/admin/game/${g.id}">Manage</a>
          <button class="btn s r" data-delgame="${g.id}">Delete</button></div>`).join('')
        : '<div class="row mut">No games yet. Create one above, then share its join link with your teams.</div>'}</div>`;
    $('#ng').onsubmit = async (e) => {
      e.preventDefault();
      const { data, error } = await sb.from('games').insert({ host_id: user.id, title: $('#gt').value.trim() }).select('id').single();
      if (error) return toast(error.message, true);
      location.hash = '#/admin/game/' + data.id;
    };
    $$('[data-copy]').forEach((b) => (b.onclick = () => copyText(joinUrl(b.dataset.copy))));
    $$('[data-delgame]').forEach((b) => guard(b, async () => {
      if (!confirm('Delete this game with all its teams and scores? This cannot be undone.')) return;
      const { error } = await sb.from('games').delete().eq('id', b.dataset.delgame);
      if (error) throw new Error(error.message);
      toast('Game deleted'); await refresh();
    }));
  }

  function drawPuzzles() {
    $('#pane').innerHTML = `
      <div class="card"><h3>Add puzzles</h3>
        <p class="mut">Upload a .json file, or paste one puzzle or a list. Puzzles with an existing id are updated.
        Each puzzle needs exactly 3 suspects, 3 weapons and 3 locations.</p>
        <input type="file" id="pf" accept=".json,application/json" aria-label="Puzzle JSON file">
        <p><textarea id="pt" placeholder="Paste puzzle JSON here" aria-label="Puzzle JSON"></textarea></p>
        <button class="btn" id="imp">Import puzzles</button>
        <button class="btn o" id="samples">Add the 3 sample puzzles</button>
        <button class="btn o" id="exp"${puzzles.length ? '' : ' disabled'}>Export library (.json)</button></div>
      <div class="card" style="padding:0">${puzzles.length ? puzzles.map((p) => `
        <div class="row" style="align-items:flex-start"><div class="grow"><b>${esc(p.title)}</b> <span class="mut">(${esc(p.slug)})</span>
          ${open.has(p.id) ? `<div class="note">${puzzleCardHtml(p.content, esc, p.title)}
            <p class="ok">Answer: ${esc(p.solution.suspect)} · ${esc(p.solution.weapon)} · ${esc(p.solution.location)}</p>
            <p>${esc(p.explanation || '')}</p></div>` : ''}</div>
          <button class="btn s o" data-prev="${p.id}">${open.has(p.id) ? 'Hide' : 'Preview'}</button>
          <button class="btn s r" data-delp="${p.id}">Delete</button></div>`).join('')
        : '<div class="row mut">Your library is empty. Add the sample puzzles to try the game.</div>'}</div>`;

    const run = async (text) => {
      const n = await importPuzzles(text, user.id);
      toast(`Saved ${n} puzzle${n === 1 ? '' : 's'}`); await refresh();
    };
    guard($('#imp'), async () => { const t = $('#pt').value.trim(); if (!t) throw new Error('Paste some JSON or choose a file first.'); await run(t); });
    guard($('#samples'), () => run(JSON.stringify(SAMPLES)));
    $('#pf').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 1_000_000) return toast('That file is too large (limit 1 MB).', true);
      try { await run(await f.text()); } catch (err) { toast(err.message, true); }
    };
    const ex = $('#exp');
    if (ex) ex.onclick = () => download('puzzles.json', JSON.stringify(puzzles.map((p) => ({
      id: p.slug, title: p.title, ...p.content, solution: p.solution, explanation: p.explanation })), null, 2), 'application/json');
    $$('[data-prev]').forEach((b) => (b.onclick = () => { open.has(b.dataset.prev) ? open.delete(b.dataset.prev) : open.add(b.dataset.prev); drawPuzzles(); }));
    $$('[data-delp]').forEach((b) => guard(b, async () => {
      if (!confirm('Delete this puzzle from your library? Rounds already played keep their results.')) return;
      const { error } = await sb.from('puzzles').delete().eq('id', b.dataset.delp);
      if (error) throw new Error(error.message);
      await refresh();
    }));
  }

  await refresh();
}
