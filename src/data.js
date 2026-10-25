import { sb } from './supabase.js';
import { debounce, esc, avatar, icon } from './ui.js';

const must = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };

export async function loadState(gameId) {
  const [g, teams, rounds, results] = await Promise.all([
    sb.from('games').select('*').eq('id', gameId).maybeSingle(),
    sb.from('teams').select('id,name,created_at,team_members(user_id,player_name,ready)').eq('game_id', gameId).order('created_at'),
    sb.from('rounds').select('*').eq('game_id', gameId).order('round_no'),
    sb.from('results').select('*').eq('game_id', gameId),
  ]);
  const game = must(g);
  if (!game) throw new Error('Game not found, or you do not have access to it.');
  const st = { game, teams: must(teams), rounds: must(rounds), results: must(results) };
  st.current = st.rounds.find((r) => r.id === game.current_round_id) || null;
  return st;
}

/** The puzzle text is only readable once the countdown is over (enforced by the database). */
export async function loadContent(roundId) {
  const { data, error } = await sb.from('round_content').select('content').eq('round_id', roundId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.content || null;
}

/**
 * 'none'      no round yet (waiting room)
 * 'countdown' host pressed Start, get-ready countdown running
 * 'live'      round clock running
 * 'closed'    round finished
 * 'cancelled' host cancelled during the countdown (treated like waiting room)
 */
export function phase(r, nowMs) {
  if (!r) return 'none';
  const start = new Date(r.started_at).getTime();
  if (r.status === 'closed') return nowMs < start ? 'cancelled' : 'closed';
  return nowMs < start ? 'countdown' : 'live';
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
  const cb = debounce(onChange, 250);
  const ch = sb.channel('game-' + gameId + '-' + Math.random().toString(36).slice(2));
  [['games', 'id'], ['rounds', 'game_id'], ['teams', 'game_id'], ['team_members', 'game_id'], ['results', 'game_id']]
    .forEach(([table, col]) =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `${col}=eq.${gameId}` }, cb));
  ch.subscribe();
  const poll = setInterval(onChange, 8000);
  return () => { clearInterval(poll); sb.removeChannel(ch); };
}

/** Names of teams that solved a puzzle since the previous refresh. */
export function newSolves(prev, st) {
  if (!prev) return [];
  const was = new Set(prev.results.filter((r) => r.solved).map((r) => r.round_id + r.team_id));
  return st.results
    .filter((r) => r.solved && !was.has(r.round_id + r.team_id))
    .map((r) => st.teams.find((t) => t.id === r.team_id)?.name)
    .filter(Boolean);
}

export function counts(st) {
  const players = st.teams.flatMap((t) => t.team_members);
  return { teams: st.teams.length, players: players.length, ready: players.filter((p) => p.ready).length };
}

/** Waiting-room roster. Options: meId highlights the viewer; remove adds a host "Remove" button. */
export function rosterHtml(st, { meId = null, remove = false } = {}) {
  if (!st.teams.length) {
    return `<div class="empty">${icon('users', 28)}<p class="mt-2">No teams yet. Players appear here the moment they join.</p></div>`;
  }
  return `<div class="roster">${st.teams.map((t) => {
    const mine = meId && t.team_members.some((m) => m.user_id === meId);
    return `<div class="team${mine ? ' me' : ''}"><h4><span>${esc(t.name)}${mine ? ' <span class="badge brand">Your team</span>' : ''}</span>
      ${remove ? `<button class="btn sm ghost" data-del="${t.id}" data-name="${esc(t.name)}" aria-label="Remove team ${esc(t.name)}">${icon('trash', 15)}</button>` : ''}</h4>
      ${t.team_members.map((m) => `<div class="player">${avatar(m.player_name)}<span>${esc(m.player_name)}</span>
        <span class="st${m.ready ? ' on' : ''}">${m.ready ? icon('check', 14) + ' Ready' : 'Not ready'}</span></div>`).join('')}</div>`;
  }).join('')}</div>`;
}

export function leaderboardHtml(rows, meTeamId = null) {
  if (!rows.length) return `<div class="empty">No teams have joined yet.</div>`;
  return rows.map((x, i) => `
    <div class="lb-row${i === 0 && x.total > 0 ? ' top' : ''}">
      <div class="rank${x.total > 0 ? " r" + (i + 1) : ""}">${i + 1}</div>
      <div class="grow"><div class="b">${esc(x.team.name)}${x.team.id === meTeamId ? ' <span class="badge brand">You</span>' : ''}</div>
        <div class="muted sm">${esc(x.team.team_members.map((m) => m.player_name).join(', '))}</div></div>
      <div class="muted sm">${x.solved} solved</div>
      <div class="score">${x.total}</div>
    </div>`).join('');
}
