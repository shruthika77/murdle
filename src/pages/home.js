import { hostIdentity, playerIdentity } from '../supabase.js';
import { esc, topbar, $, icon } from '../ui.js';

export async function mount(app) {
  const [host, player] = await Promise.all([hostIdentity(), playerIdentity()]);
  const role = host.role, user = player.user;
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
          <input id="jc" autocomplete="off" autocapitalize="none" required placeholder="Paste the link or the 8-letter code">
          <small id="jerr" style="color:var(--red);font-weight:600;min-height:18px" role="alert"></small></label>
          <button class="btn lg block" type="submit">Continue</button></form>
        ${last && user && player.role === 'team' ? `<p class="mt sm"><a href="#/play/${esc(last)}">Return to your last game</a></p>` : ''}
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
    const raw = $('#jc').value.trim();
    const m = raw.match(/join\/([a-z0-9]+)/i);
    const code = (m ? m[1] : raw).replace(/[^a-z0-9]/gi, '').toLowerCase();
    const err = (t) => { $('#jerr').textContent = t; $('#jc').focus(); };
    if (!code) return err('Paste the link or code your host gave you.');
    if (!m && code.length === 5) return err('That looks like a team code. Open your host’s join link first, then choose “Join my team” and enter it there.');
    if (!m && code.length !== 8) return err('A game code has 8 characters. Check it, or paste the whole join link.');
    location.hash = '#/join/' + code;
  };
}
