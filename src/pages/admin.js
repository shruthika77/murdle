import { sb } from '../supabase.js';
import { esc, topbar, $, $$, guard, toast, joinUrl, copyText, download, icon, statusBadge } from '../ui.js';
import { requireAdmin } from './_auth.js';
import { importPuzzles, caseHtml } from '../puzzles.js';
import { SAMPLES } from '../samples.js';

export async function mount(app) {
  const user = await requireAdmin(app);
  if (!user) return;

  let tab = 'games';
  let games = [];
  let puzzles = [];
  const open = new Set();

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
    app.innerHTML = topbar(`<span class="muted sm">${esc(user.email)}</span>
      <button class="btn sm sec" id="out">${icon('logout', 15)} Sign out</button>`) + `
      <main class="wrap">
        <div class="page-h"><div><div class="eyebrow">Host dashboard</div><h1 style="font-size:34px">Your games</h1></div></div>
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
      <div class="card mb"><div class="card-h"><h3>${icon('plus', 17)} New game</h3></div>
        <form id="ng" class="flex wrapf" style="align-items:flex-end">
          <label class="field grow" style="margin:0;min-width:240px"><span>Game name</span><input id="gt" maxlength="80" required placeholder="Friday office mystery night"></label>
          <button class="btn lg" type="submit">Create game</button></form></div>
      <div class="card flush">${games.length ? games.map((g) => `
        <div class="item"><div class="grow"><div class="b">${esc(g.title)}</div>
          <div class="muted sm">${new Date(g.created_at).toLocaleString()}</div></div>
          ${statusBadge(g.status)}
          <button class="btn sm sec" data-copy="${esc(g.join_code)}">${icon('link', 15)} Copy join link</button>
          <a class="btn sm" href="#/admin/game/${g.id}">Manage</a>
          <button class="btn sm ghost" data-delgame="${g.id}" aria-label="Delete game">${icon('trash', 16)}</button></div>`).join('')
        : `<div class="empty">${icon('flag', 28)}<p class="mt-2">No games yet. Create one above, then share its join link with your teams.</p></div>`}</div>`;
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
      <div class="card mb"><div class="card-h"><h3>${icon('book', 17)} Add puzzles</h3></div>
        <p class="muted sm">Upload a .json file or paste one puzzle or a list. Puzzles with an existing id are updated.
        Each puzzle needs exactly 3 suspects, 3 weapons and 3 locations.</p>
        <input type="file" id="pf" accept=".json,application/json" aria-label="Puzzle JSON file">
        <textarea id="pt" class="mt-2" placeholder="Paste puzzle JSON here" aria-label="Puzzle JSON"></textarea>
        <div class="flex wrapf mt-2"><button class="btn" id="imp">Import puzzles</button>
          <button class="btn sec" id="samples">Add the 13 sample puzzles</button>
          <button class="btn sec" id="exp"${puzzles.length ? '' : ' disabled'}>${icon('download', 15)} Export library</button></div></div>
      <div class="card flush">${puzzles.length ? puzzles.map((p) => `
        <div class="item" style="align-items:flex-start"><div class="grow"><div class="b">${esc(p.title)} <span class="muted sm">${esc(p.slug)}</span></div>
          ${open.has(p.id) ? `<div class="callout mt-2">${caseHtml(p.content, esc)}
            <details class="spoiler"><summary>Show answer (spoiler)</summary>
              <div class="callout ok mt-2"><b>Answer:</b> ${esc(p.solution.suspect)} · ${esc(p.solution.weapon)} · ${esc(p.solution.location)}</div>
              <p class="sm mt-2">${esc(p.explanation || '')}</p></details></div>` : ''}</div>
          <button class="btn sm sec" data-prev="${p.id}">${icon('eye', 15)} ${open.has(p.id) ? 'Hide' : 'Preview'}</button>
          <button class="btn sm ghost" data-delp="${p.id}" aria-label="Delete puzzle">${icon('trash', 16)}</button></div>`).join('')
        : `<div class="empty">${icon('book', 28)}<p class="mt-2">Your library is empty. Add the sample puzzles to try the game.</p></div>`}</div>`;

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
