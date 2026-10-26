import { hostIdentity, playerIdentity } from '../supabase.js';
import { esc, topbar, $, icon } from '../ui.js';
import { THEMES, sceneSvg } from '../themes.js';
import { avatarSvg, PRESETS } from '../avatars.js';

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
        <div class="hero-art">${sceneSvg(THEMES[Math.floor(Math.random() * THEMES.length)])}<div class="peek">${avatarSvg(PRESETS[0].cfg, 150)}</div></div>
        <h1>Gather your team.<span class="l2">Crack the case.</span></h1>
        <p class="lead">A live murder-mystery race for the whole room. Teams join from their phones, study the suspects,
        fill in the deduction grid and beat the clock to name who did it, with what, and where.</p>
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
    <section class="perks">
      <div class="perk"><span class="pi">🎭</span><div><b>A new scene every level</b><span class="muted sm">Each case gets its own cartoon setting, from moonlit manors to stormy harbours.</span></div></div>
      <div class="perk"><span class="pi">🕵️</span><div><b>Mugshot line-ups</b><span class="muted sm">Every suspect gets a cartoon mugshot, and every player builds their own detective.</span></div></div>
      <div class="perk"><span class="pi">🧠</span><div><b>Smart deduction grid</b><span class="muted sm">Confirm a pair and the impossible squares cross themselves out.</span></div></div>
      <div class="perk"><span class="pi">🔴</span><div><b>The big reveal</b><span class="muted sm">Evidence cards flip and a CASE CLOSED stamp lands on every screen at once.</span></div></div>
    </section>
    <section class="steps">
      <div class="card step"><div class="num">1</div><h3>Open the link</h3><p class="muted sm mt-2">Create a team, or join a teammate with their team code. No account needed.</p></div>
      <div class="card step"><div class="num">2</div><h3>Wait in the lobby</h3><p class="muted sm mt-2">See your teammates arrive and tap “I’m ready”. The host starts when everyone is in.</p></div>
      <div class="card step"><div class="num">3</div><h3>Solve together</h3><p class="muted sm mt-2">A short briefing countdown, then the clock starts. Use the grid, your notebook and hints, then name the culprit.</p></div>
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
