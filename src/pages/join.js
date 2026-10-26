import { sb, ensurePlayerSession } from '../supabase.js';
import { esc, topbar, $, guard, toast, icon } from '../ui.js';
import { mountAvatarPicker, DEFAULT_AVATAR, randomAvatar, sanitize } from '../avatars.js';

export async function mount(app, [code]) {
  const head = topbar('<a class="btn sm ghost" href="#/">Back</a>');
  const user = await ensurePlayerSession();
  const { data, error } = await sb.rpc('get_game_by_code', { p_code: code });
  if (error) throw new Error(error.message);
  const game = data?.[0];
  if (!game) {
    app.innerHTML = head + `<main class="wrap"><div class="narrow"><div class="card center"><h2>Link not valid</h2>
      <p class="muted mt-2">We couldn’t find a game for the code <b>${esc(code)}</b>. Check it, or ask your host to send the link again.</p>
      <a class="btn mt" href="#/">Try again</a></div></div></main>`;
    return;
  }

  const { data: mem } = await sb.from('team_members').select('team_id').eq('game_id', game.id).eq('user_id', user.id).maybeSingle();
  if (mem) { localStorage.setItem('cc_game', game.id); location.hash = '#/play/' + game.id; return; }

  if (game.status === 'finished') {
    app.innerHTML = head + `<main class="wrap"><div class="narrow"><div class="card center"><h2>${esc(game.title)}</h2>
      <p class="muted mt-2">This game has already finished.</p></div></div></main>`;
    return;
  }

  let mode = 'new';
  const saved = localStorage.getItem('cc_player') || '';
  let avatar = DEFAULT_AVATAR;
  try { avatar = sanitize(JSON.parse(localStorage.getItem('cc_avatar'))) } catch { avatar = randomAvatar(); }
  if (!localStorage.getItem('cc_avatar')) avatar = randomAvatar();

  const draw = () => {
    app.innerHTML = head + `<main class="wrap"><div class="narrow" style="padding-top:20px;max-width:560px">
      <div class="card">
        <div class="eyebrow">You’re invited to</div><h2 class="mt-2 mb">${esc(game.title)}</h2>
        <div class="tabs" role="tablist" style="display:flex">
          <button class="grow" role="tab" id="t-new" aria-selected="${mode === 'new'}">Create a team</button>
          <button class="grow" role="tab" id="t-old" aria-selected="${mode === 'old'}">Join my team</button></div>
        <form id="f">
          ${mode === 'new'
            ? `<label class="field"><span>Team name</span><input id="tn" maxlength="40" minlength="2" required autocomplete="off" placeholder="e.g. The Sleuth Squad"></label>`
            : `<label class="field"><span>Team code</span><input id="tc" maxlength="8" required autocomplete="off" style="text-transform:uppercase;letter-spacing:.2em" placeholder="ABC12">
                <small>Ask a teammate. It’s shown at the top of their screen.</small></label>`}
          <label class="field"><span>Your name</span><input id="pn" maxlength="30" required value="${esc(saved)}" autocomplete="given-name"></label>
          <div class="field"><span>Make your cartoon detective</span><div id="pk"></div></div>
          <button class="btn lg block" id="go" type="submit">${mode === 'new' ? 'Create team and enter lobby' : 'Join team'}</button>
        </form>
        <p class="muted sm mt">Teammates open this same link, choose “Join my team”, and enter the team code.
        If you lose your place, rejoin the same way.</p>
      </div></div></main>`;
    const picker = mountAvatarPicker($('#pk'), avatar, (c) => { avatar = c; });
    $('#t-new').onclick = () => { mode = 'new'; draw(); };
    $('#t-old').onclick = () => { mode = 'old'; draw(); };
    $('#f').onsubmit = async (e) => {
      e.preventDefault();
      const go = $('#go'); go.disabled = true;
      const player = $('#pn').value.trim(); avatar = picker.get();
      try {
        const res = mode === 'new'
          ? await sb.rpc('join_game', { p_code: code, p_team_name: $('#tn').value, p_player: player, p_avatar: avatar })
          : await sb.rpc('join_team', { p_code: code, p_team_code: $('#tc').value, p_player: player, p_avatar: avatar });
        if (res.error) throw new Error(res.error.message);
        localStorage.setItem('cc_player', player);
        localStorage.setItem('cc_avatar', JSON.stringify(avatar));
        localStorage.setItem('cc_game', res.data.game_id);
        location.hash = '#/play/' + res.data.game_id;
      } catch (err) { toast(err.message, true); go.disabled = false; }
    };
  };
  draw();
}
