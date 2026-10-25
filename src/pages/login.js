import { sb, whoAmI } from '../supabase.js';
import { esc, topbar, $, toast } from '../ui.js';

export async function mount(app) {
  const { role } = await whoAmI();
  if (role === 'admin') { location.hash = '#/admin'; return; }
  let mode = 'in';
  const draw = (note = '') => {
    app.innerHTML = topbar('<a class="btn sm ghost" href="#/">Back</a>') + `<main class="wrap"><div class="narrow" style="padding-top:28px">
      <div class="card">
        <h2>${mode === 'in' ? 'Host sign in' : 'Create a host account'}</h2>
        <p class="muted sm mt-2 mb">${mode === 'in' ? 'Manage your games, puzzles and scoring.' : 'The first account becomes the admin. Later accounts need approval.'}</p>
        <form id="f"><label class="field"><span>Email</span><input id="em" type="email" autocomplete="email" required></label>
          <label class="field"><span>Password</span><input id="pw" type="password" minlength="8" autocomplete="${mode === 'in' ? 'current-password' : 'new-password'}" required>
            ${mode === 'up' ? '<small>At least 8 characters.</small>' : ''}</label>
          <p class="b" style="color:var(--red);min-height:20px" id="er" role="alert">${esc(note)}</p>
          <button class="btn lg block" id="go" type="submit">${mode === 'in' ? 'Sign in' : 'Create account'}</button></form>
        <p class="center sm mt"><a href="#" id="sw">${mode === 'in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</a></p>
      </div>
      <p class="muted sm center mt">Players don’t need an account. They just open the join link from their host.</p></div></main>`;
    $('#sw').onclick = (e) => { e.preventDefault(); mode = mode === 'in' ? 'up' : 'in'; draw(); };
    $('#f').onsubmit = async (e) => {
      e.preventDefault();
      const go = $('#go'); go.disabled = true;
      const email = $('#em').value.trim(), password = $('#pw').value;
      try {
        if (mode === 'up') {
          const { data, error } = await sb.auth.signUp({ email, password });
          if (error) throw error;
          if (!data.session) { mode = 'in'; draw(''); toast('Check your email to confirm your account, then sign in.'); return; }
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
        location.hash = '#/admin';
      } catch (err) { $('#er').textContent = err.message; go.disabled = false; }
    };
  };
  draw();
}
