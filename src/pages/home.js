import { whoAmI } from '../supabase.js';
import { esc, topbar, $, icon } from '../ui.js';

export async function mount(app) {
  const { user, role } = await whoAmI();
  const last = localStorage.getItem('cc_game');
  app.innerHTML = topbar(role === 'admin'
    ? `<a class="btn sm" href="#/admin">Host dashboard</a>`
    : `<a class="btn sm sec" href="#/admin/login">Host sign in</a>`) + `
  <main class="wrap">
    <section class="hero">
      <div>
        <span class="badge brand">Team murder-mystery game</span>
        <h1 class="mt-2">Gather your team.<br>Crack the case.</h1>
        <p class="lead">A host runs the rounds. Teams join from their own phones with a link, wait together in the lobby,
        study the clues, and race the clock to name the suspect, the weapon and the location.</p>
      </div>
      <div class="card">
        <h3 class="mb">${icon('door', 18)} Join a game</h3>
        <form id="jf"><label class="field"><span>Join link or code</span>
          <input id="jc" autocomplete="off" required placeholder="Paste the link your host sent"></label>
          <button class="btn lg block" type="submit">Continue</button></form>
        ${last && user && role === 'team' ? `<p class="mt sm"><a href="#/play/${esc(last)}">Return to your last game</a></p>` : ''}
        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
        <p class="muted sm" style="margin:0">Running the game? <a href="#/admin/login">Sign in as host</a></p>
      </div>
    </section>
    <section class="steps">
      <div class="card step"><div class="num">1</div><h3>Open the link</h3><p class="muted sm mt-2">Create a team, or join a teammate with their team code. No account needed.</p></div>
      <div class="card step"><div class="num">2</div><h3>Wait in the lobby</h3><p class="muted sm mt-2">See your teammates arrive and tap “I’m ready”. The host starts when everyone is in.</p></div>
      <div class="card step"><div class="num">3</div><h3>Solve together</h3><p class="muted sm mt-2">A 15-second countdown, then the clock starts. Use the deduction grid and submit your answer.</p></div>
    </section>
  </main>`;
  $('#jf').onsubmit = (e) => {
    e.preventDefault();
    const v = $('#jc').value.trim();
    const code = (v.match(/join\/([a-z0-9]+)/i) || [null, v])[1].replace(/[^a-z0-9]/gi, '');
    if (code.length < 4) return;
    location.hash = '#/join/' + code.toLowerCase();
  };
}
