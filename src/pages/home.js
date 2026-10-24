import { whoAmI } from '../supabase.js';
import { esc, topbar, $ } from '../ui.js';

export async function mount(app) {
  const { user, role } = await whoAmI();
  const last = localStorage.getItem('cc_game');
  app.innerHTML = topbar() + `<main>
    <section class="hero"><h1>Case closed.<br>Who did it?</h1>
      <p>A team murder-mystery game. A host runs the rounds; teams join from their own phones with a link,
      read the clues, and race to name the suspect, weapon and location.</p></section>
    <div class="split">
      <div class="card"><h3>I'm hosting</h3>
        <p class="mut">Create games, load puzzles, start rounds and watch the scores live.</p>
        ${role === 'admin'
          ? `<a class="btn" style="display:inline-block;text-decoration:none" href="#/admin">Open host dashboard</a>`
          : `<a class="btn" style="display:inline-block;text-decoration:none" href="#/admin/login">Host sign in</a>`}
      </div>
      <div class="card"><h3>I'm playing</h3>
        <p class="mut">Paste the join link or code your host gave you.</p>
        <form id="jf" class="inline"><label>Join link or code<input id="jc" autocomplete="off" required></label>
          <button class="btn" type="submit">Join game</button></form>
        ${last && user && role === 'team' ? `<p><a href="#/play/${esc(last)}">Resume your last game</a></p>` : ''}
      </div>
    </div></main>`;
  $('#jf').onsubmit = (e) => {
    e.preventDefault();
    const v = $('#jc').value.trim();
    const code = (v.match(/join\/([a-z0-9]+)/i) || [null, v])[1].replace(/[^a-z0-9]/gi, '');
    if (code.length < 4) return;
    location.hash = '#/join/' + code.toLowerCase();
  };
}
