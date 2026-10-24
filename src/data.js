import { sb } from './supabase.js';
import { debounce, esc } from './ui.js';

const must = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };

export async function loadState(gameId) {
  const [g, teams, rounds, results] = await Promise.all([
    sb.from('games').select('*').eq('id', gameId).maybeSingle(),
    sb.from('teams').select('id,name,created_at,team_members(user_id,player_name)').eq('game_id', gameId).order('created_at'),
    sb.from('rounds').select('*').eq('game_id', gameId).order('round_no'),
    sb.from('results').select('*').eq('game_id', gameId),
  ]);
  const game = must(g);
  if (!game) throw new Error('Game not found, or you do not have access to it.');
  const st = { game, teams: must(teams), rounds: must(rounds), results: must(results) };
  st.current = st.rounds.find((r) => r.id === game.current_round_id) || null;
  return st;
}

/** Cumulative standings. Ties are broken by most puzzles solved, then least total solve time. */
export function standings(st) {
  const rows = st.teams.map((t) => {
    const mine = st.results.filter((r) => r.team_id === t.id);
    const byRound = {};
    mine.forEach((r) => (byRound[r.round_id] = r));
    return {
      team: t,
      total: mine.reduce((a, r) => a + r.score, 0),
      solved: mine.filter((r) => r.solved).length,
      time: mine.filter((r) => r.solved).reduce((a, r) => a + (r.solve_seconds || 0), 0),
      byRound,
    };
  });
  rows.sort((a, b) => b.total - a.total || b.solved - a.solved || a.time - b.time || a.team.name.localeCompare(b.team.name));
  return rows;
}

/** Realtime updates plus a polling fallback, so screens stay correct even if Realtime is switched off. */
export function subscribe(gameId, onChange) {
  const cb = debounce(onChange, 300);
  const ch = sb.channel('game-' + gameId + '-' + Math.random().toString(36).slice(2));
  [['games', 'id'], ['rounds', 'game_id'], ['teams', 'game_id'], ['team_members', 'game_id'], ['results', 'game_id']]
    .forEach(([table, col]) =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `${col}=eq.${gameId}` }, cb));
  ch.subscribe();
  const poll = setInterval(onChange, 10000);
  return () => { clearInterval(poll); sb.removeChannel(ch); };
}

/** Names of teams that solved a puzzle since the previous refresh, so every screen can celebrate. */
export function newSolves(prev, st) {
  if (!prev) return [];
  const was = new Set(prev.results.filter((r) => r.solved).map((r) => r.round_id + r.team_id));
  return st.results
    .filter((r) => r.solved && !was.has(r.round_id + r.team_id))
    .map((r) => st.teams.find((t) => t.id === r.team_id)?.name)
    .filter(Boolean);
}

export function leaderboardHtml(rows) {
  if (!rows.length) return '<div class="row mut">No teams have joined yet.</div>';
  return rows.map((x, i) => `
    <div class="row${i === 0 && x.total > 0 ? ' lead' : ''}">
      <div class="rank">${i + 1}</div>
      <div class="grow"><b>${esc(x.team.name)}${i === 0 && x.total > 0 ? ' 👑' : ''}</b><br>
        <span class="mut">${esc(x.team.team_members.map((m) => m.player_name).join(', '))}</span></div>
      <div class="mut">${x.solved} solved</div>
      <div class="big">${x.total}</div>
    </div>`).join('');
}
