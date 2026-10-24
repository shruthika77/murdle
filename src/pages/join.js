import { sb, whoAmI, ensurePlayerSession } from '../supabase.js';
import { esc, topbar, $, guard, toast } from '../ui.js';

export async function mount(app, [code]) {
  const head = topbar();
  const { user: cur, role } = await whoAmI();

  if (role === 'admin') {
    app.innerHTML = head + `<main style="max-width:520px"><div class="card"><h2>You're signed in as host</h2>
      <p>Joining from this browser would use your host account. To play, open the link in a different browser or
      private window, or sign out here first.</p>
      <button class="btn r" id="so">Sign out and continue as player</button>
      <a class="btn o" style="display:inline-block;text-decoration:none" href="#/admin">Back to dashboard</a></div></main>`;
    guard($('#so'), async () => { await sb.auth.signOut(); location.reload(); });
    return;
  }

  const user = cur || await ensurePlayerSession();
  const { data, error } = await sb.rpc('get_game_by_code', { p_code: code });
  if (error) throw new Error(error.message);
  const game = data?.[0];
  if (!game) {
    app.innerHTML = head + `<main><div class="card"><h2>Link not valid</h2>
      <p>We couldn't find a game for that link. Ask your host to send it again.</p></div></main>`;
    return;
  }

  const { data: mem } = await sb.from('team_members').select('team_id').eq('game_id', game.id).eq('user_id', user.id).maybeSingle();
  if (mem) { localStorage.setItem('cc_game', game.id); location.hash = '#/play/' + game.id; return; }

  if (game.status === 'finished') {
    app.innerHTML = head + `<main><div class="card"><h2>${esc(game.title)}</h2><p>This game has already finished.</p></div></main>`;
    return;
  }

  let mode = 'new';
  const saved = localStorage.getItem('cc_player') || '';
  const draw = () => {
    app.innerHTML = head + `<main style="max-width:520px"><div class="card">
      <p class="mut">You're invited to</p><h2 style="margin-top:0">${esc(game.title)}</h2>
      <div class="tabs" role="tablist">
        <button role="tab" id="t-new" aria-selected="${mode === 'new'}">Create a team</button>
        <button role="tab" id="t-old" aria-selected="${mode === 'old'}">Join my team</button></div>
      <form id="f">
        ${mode === 'new'
          ? `<p><label>Team name<input id="tn" maxlength="40" minlength="2" required autocomplete="off"></label></p>`
          : `<p><label>Team code (ask a teammate; it's shown on their screen)<input id="tc" maxlength="8" required autocomplete="off" style="text-transform:uppercase"></label></p>`}
        <p><label>Your name<input id="pn" maxlength="30" required value="${esc(saved)}" autocomplete="given-name"></label></p>
        <button class="btn" id="go" type="submit">${mode === 'new' ? 'Create team and join' : 'Join team'}</button>
      </form>
      <p class="mut">Teammates join the same link, choose “Join my team”, and enter the team code. If you lose your place,
      rejoin the same way.</p></div></main>`;
    $('#t-new').onclick = () => { mode = 'new'; draw(); };
    $('#t-old').onclick = () => { mode = 'old'; draw(); };
    $('#f').onsubmit = async (e) => {
      e.preventDefault();
      const go = $('#go'); go.disabled = true;
      const player = $('#pn').value.trim();
      try {
        const res = mode === 'new'
          ? await sb.rpc('join_game', { p_code: code, p_team_name: $('#tn').value, p_player: player })
          : await sb.rpc('join_team', { p_code: code, p_team_code: $('#tc').value, p_player: player });
        if (res.error) throw new Error(res.error.message);
        localStorage.setItem('cc_player', player);
        localStorage.setItem('cc_game', res.data.game_id);
        location.hash = '#/play/' + res.data.game_id;
      } catch (err) { toast(err.message, true); go.disabled = false; }
    };
  };
  draw();
}
