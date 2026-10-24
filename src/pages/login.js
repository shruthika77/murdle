import { sb, whoAmI } from '../supabase.js';
import { esc, topbar, $, toast } from '../ui.js';

export async function mount(app) {
  const { role } = await whoAmI();
  if (role === 'admin') { location.hash = '#/admin'; return; }
  let mode = 'in';
  const draw = (note = '') => {
    app.innerHTML = topbar() + `<main style="max-width:460px"><div class="card">
      <h2>${mode === 'in' ? 'Host sign in' : 'Create host account'}</h2>
      <form id="f"><p><label>Email<input id="em" type="email" autocomplete="email" required></label></p>
        <p><label>Password${mode === 'up' ? ' (min 8 characters)' : ''}<input id="pw" type="password" minlength="8"
          autocomplete="${mode === 'in' ? 'current-password' : 'new-password'}" required></label></p>
        <p class="err" id="er">${esc(note)}</p>
        <button class="btn" id="go" type="submit">${mode === 'in' ? 'Sign in' : 'Create account'}</button>
        <button class="btn o" id="sw" type="button">${mode === 'in' ? 'Need an account?' : 'I already have one'}</button></form>
      <p class="mut">Players don't need an account. They just open the join link from their host.</p></div></main>`;
    $('#sw').onclick = () => { mode = mode === 'in' ? 'up' : 'in'; draw(); };
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
