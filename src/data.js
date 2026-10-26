import { sb, client } from './supabase.js';
import { debounce, esc, avatar, avatarStack, icon, ago, fmtTime } from './ui.js';

const must = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };

export async function loadState(gameId) {
  const [g, teams, rounds, results, feed] = await Promise.all([
    sb.from('games').select('*').eq('id', gameId).maybeSingle(),
    sb.from('teams').select('id,name,created_at,team_members(user_id,player_name,ready,avatar)').eq('game_id', gameId).order('created_at'),
    sb.from('rounds').select('*').eq('game_id', gameId).order('round_no'),
    sb.from('results').select('*').eq('game_id', gameId),
    sb.from('activity').select('*').eq('game_id', gameId).order('id', { ascending: false }).limit(14),
  ]);
  const game = must(g);
  if (!game) throw new Error('Game not found, or you do not have access to it.');
  const st = { game, teams: must(teams), rounds: must(rounds), results: must(results), feed: feed.data || [] };
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
  const c = client();                       // remember which session this screen uses
  const ch = c.channel('game-' + gameId + '-' + Math.random().toString(36).slice(2));
  [['games', 'id'], ['rounds', 'game_id'], ['teams', 'game_id'], ['team_members', 'game_id'], ['results', 'game_id'], ['activity', 'game_id']]
    .forEach(([table, col]) =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `${col}=eq.${gameId}` }, cb));
  ch.subscribe();
  const poll = setInterval(onChange, 8000);
  return () => { clearInterval(poll); c.removeChannel(ch); };
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
      ${t.team_members.map((m) => `<div class="player">${avatar(m.player_name, false, m.avatar)}<span>${esc(m.player_name)}</span>
        <span class="st${m.ready ? ' on' : ''}">${m.ready ? icon('check', 14) + ' Ready' : 'Not ready'}</span></div>`).join('')}</div>`;
  }).join('')}</div>`;
}

export function leaderboardHtml(rows, meTeamId = null) {
  if (!rows.length) return `<div class="empty">No teams have joined yet.</div>`;
  return rows.map((x, i) => `
    <div class="lb-row${i === 0 && x.total > 0 ? ' top' : ''}">
      <div class="rank${x.total > 0 ? " r" + (i + 1) : ""}">${i + 1}</div>
      ${avatarStack(x.team.team_members)}
      <div class="grow"><div class="b">${esc(x.team.name)}${x.team.id === meTeamId ? ' <span class="badge brand">You</span>' : ''}</div>
        <div class="muted sm">${esc(x.team.team_members.map((m) => m.player_name).join(', '))}</div></div>
      <div class="muted sm">${x.solved} solved</div>
      <div class="score">${x.total}</div>
    </div>`).join('');
}

/** Per-round scoreboard table (host console and projector). */
export function scoreboardHtml(st, { big = false } = {}) {
  const rows = standings(st);
  const live = st.current && st.current.status === 'live' ? st.current.id : null;
  if (!rows.length) return `<div class="empty">No teams yet.</div>`;
  return `<div class="tw"><table class="data${big ? ' big' : ''}"><thead><tr><th>#</th><th>Team</th>
    ${st.rounds.map((r) => `<th class="num${r.id === live ? ' livecol' : ''}" title="${esc(r.title)}">R${r.round_no}${r.id === live ? ' <span class="badge live">live</span>' : ''}</th>`).join('')}
    <th class="num">Total</th></tr></thead><tbody>
    ${rows.map((x, i) => `<tr class="${i === 0 && x.total > 0 ? 'toprow' : ''}"><td><span class="rank${x.total > 0 ? ' r' + (i + 1) : ''}">${i + 1}</span></td>
      <td><div class="flex gap-1">${avatarStack(x.team.team_members)}<span class="b">${esc(x.team.name)}</span></div></td>
      ${st.rounds.map((r) => {
        const v = x.byRound[r.id];
        const cell = !v ? '–' : v.solved ? `<b class="okc">${v.score}</b> <span class="muted xs">${fmtTime(v.solve_seconds || 0)}</span>` : v.done ? `${v.score}` : `<span class="muted">…</span>`;
        return `<td class="num${r.id === live ? ' livecol' : ''}">${cell}</td>`;
      }).join('')}
      <td class="num score">${x.total}</td></tr>`).join('')}
    </tbody></table></div>`;
}

/** Live activity feed. */
export function feedHtml(feed) {
  if (!feed?.length) return `<div class="empty sm">Activity will appear here as the game unfolds.</div>`;
  const line = (e) => {
    const t = `<b>${esc(e.team_name || '')}</b>`;
    switch (e.kind) {
      case 'joined': return [icon('user', 15), `${t} welcomed ${esc(e.detail.player || 'a player')}`];
      case 'round_start': return [icon('play', 15), `Round ${e.detail.round_no} begins: <b>${esc(e.detail.title || '')}</b>`];
      case 'attempt': return [icon('search', 15), `${t} submitted an answer: <b>${e.detail.correct} of 3</b> correct`];
      case 'out': return [icon('x', 15), `${t} used every attempt`];
      case 'solved': return [icon('trophy', 15), `${t} cracked the case in <b>${fmtTime(e.detail.seconds || 0)}</b> (+${e.detail.score})`];
      case 'hint': return [icon('book', 15), `${t} bought a detective hint`];
      default: return [icon('flag', 15), esc(e.kind)];
    }
  };
  return `<ul class="feed">${feed.map((e) => { const [ic, txt] = line(e);
    return `<li class="fe k-${e.kind}"><span class="fi">${ic}</span><span class="grow">${txt}</span><span class="muted xs">${ago(e.created_at)}</span></li>`; }).join('')}</ul>`;
}

/** Fun end-of-game awards, worked out from the results. */
export function awards(st) {
  const solved = st.results.filter((r) => r.solved);
  if (!solved.length) return [];
  const name = (id) => st.teams.find((t) => t.id === id)?.name || '?';
  const rt = (id) => st.rounds.find((r) => r.id === id);
  const out = [];
  const fastest = [...solved].sort((a, b) => (a.solve_seconds ?? 1e9) - (b.solve_seconds ?? 1e9))[0];
  out.push({ icon: '⚡', title: 'Speed Demon', team: name(fastest.team_id), note: `Solved “${rt(fastest.round_id)?.title}” in ${fmtTime(fastest.solve_seconds || 0)}` });
  const first = {}; solved.filter((r) => r.attempts === 1).forEach((r) => (first[r.team_id] = (first[r.team_id] || 0) + 1));
  const sh = Object.entries(first).sort((a, b) => b[1] - a[1])[0];
  if (sh) out.push({ icon: '🎯', title: 'Sharpshooter', team: name(sh[0]), note: `${sh[1]} case${sh[1] > 1 ? 's' : ''} solved on the first try` });
  const cnt = {}; solved.forEach((r) => (cnt[r.team_id] = (cnt[r.team_id] || 0) + 1));
  const md = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  if (st.rounds.length > 1 && md) out.push({ icon: '🕵️', title: 'Master Detective', team: name(md[0]), note: `Solved ${md[1]} of ${st.rounds.length} cases` });
  const late = solved.map((r) => ({ r, f: (r.solve_seconds || 0) / Math.max(1, rt(r.round_id)?.settings?.timer || 1) })).filter((x) => x.f >= 0.8).sort((a, b) => b.f - a.f)[0];
  if (late) out.push({ icon: '😅', title: 'Cliffhanger', team: name(late.r.team_id), note: `Cracked it with seconds to spare` });
  return out;
}

export function awardsHtml(st) {
  const a = awards(st);
  if (!a.length) return '';
  return `<div class="awards">${a.map((x) => `<div class="award"><div class="ai">${x.icon}</div><div><div class="eyebrow">${x.title}</div><div class="b">${esc(x.team)}</div><div class="muted sm">${esc(x.note)}</div></div></div>`).join('')}</div>`;
}

/** Podium for the final screen. */
export function podiumHtml(st) {
  const rows = standings(st).slice(0, 3);
  if (!rows.length) return '';
  const order = rows.length === 1 ? [0] : rows.length === 2 ? [1, 0] : [1, 0, 2];
  return `<div class="podium">${order.map((i) => { const x = rows[i]; return `<div class="pd p${i + 1}">
      <div class="pd-who">${avatarStack(x.team.team_members, true)}<div class="b">${esc(x.team.name)}</div><div class="score">${x.total}</div></div>
      <div class="pd-block"><span>${i + 1}</span></div></div>`; }).join('')}</div>`;
}
