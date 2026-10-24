# Case Closed: Team Murder Mystery

A multi-device murder-mystery game. A **host (admin)** creates a game and shares a join link. **Teams** open the
link on their own phones, read the case, fill in a deduction grid and race to name the suspect, weapon and location.
Scores update live on every screen.

Stack: Supabase (Auth, Postgres + Row Level Security, Realtime) and a static Vite site hosted on Render.

## Roles

| Role | How they get in | What they can do |
|---|---|---|
| **Admin (host)** | Email + password at `#/admin/login` | Create games, manage a puzzle library, set scoring, start / stop / reveal rounds, remove teams, export scores, open the projector view |
| **Team (joinee)** | Opens the host's join link `…/#/join/<code>`. No account, signed in anonymously | Create a team or join one with its team code, play the live round, see the leaderboard |

The first email account that signs up becomes admin. Later sign-ups are marked `pending` until you add their
email to the `admin_allowlist` table (Table Editor), so strangers can't become hosts.

## 1. Set up Supabase (about 5 minutes)

1. Create a project at https://supabase.com.
2. **Authentication → Sign In / Providers**: turn **Allow anonymous sign-ins** ON (players need this).
   For easier testing you can also turn off **Confirm email** under the Email provider.
3. **SQL Editor → New query**: paste all of `supabase/schema.sql` and press **Run**.
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
5. **Authentication → URL Configuration**: set **Site URL** to your Render URL once you have it.
6. **Authentication → Rate Limits**: anonymous sign-ins are limited per IP address. If a whole room joins from
   one Wi-Fi network, raise the anonymous sign-in limit before game night.

## 2. Run locally

```bash
cp .env.example .env      # paste your Supabase URL and anon key
npm install
npm run dev
```

Open the printed address. Sign up as host, open **Puzzle library → Add the 3 sample puzzles**, create a game, copy
its join link, and open that link in a private window to play as a team.

## 3. Deploy on Render

1. Push this folder to a GitHub repository.
2. In Render: **New → Blueprint** and pick the repo (it reads `render.yaml`), or **New → Static Site** with
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
3. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Your join links will look like `https://your-app.onrender.com/#/join/ab12cd34`.
5. Put that URL in Supabase **Site URL** (step 1.5).

The anon key is meant to be public. Security comes from Row Level Security and the server-side functions in
`schema.sql`, never from hiding the key. Do **not** put the `service_role` key in this project.

## Puzzle JSON format

Same format as the prototype, so your old files still import:

```json
{
  "id": "case-004", "title": "…", "story": "…",
  "suspects":  [{"name": "A", "trait": "…"}, {"name": "B"}, {"name": "C"}],
  "weapons":   [{"name": "…", "description": "…"}, {}, {}],
  "locations": [{"name": "…", "description": "…"}, {}, {}],
  "clues": ["…", "…", "…"],
  "solution": {"suspect": "A", "weapon": "…", "location": "…"},
  "explanation": "…"
}
```

## What changed from the prototype

The prototype stored everything in one browser's `localStorage`, so it could only work on a single device.
Problems found and how they are fixed:

| Problem in the prototype | Fix |
|---|---|
| Data lived in one browser. Teams on other phones saw nothing | Shared Postgres database with Realtime updates and a polling fallback |
| No login. Anyone could open the Host tab and run the game | Real host accounts (Supabase Auth) with an admin allow-list; all host actions are checked on the server |
| Teams picked their name from a dropdown, so anyone could play as anyone | Join link creates a team; each device has its own identity; team codes let teammates join the same team |
| Answers were sent to every player's browser in the puzzle data | Solutions live in a host-only table. Players only get a pass/fail result from `submit_answer`. The answer is sent after the host reveals it |
| Scoring ran in the browser, so scores could be edited | Scoring is computed in the database; players cannot write to results |
| Timer used each device's clock, and only a client could close the round | Timer uses the server clock; any connected client closes an expired round, the server verifies it |
| Host closing the tab could leave a round open forever | Rounds have a server-side end time and are closed on first access after it |
| Whole page re-rendered on every change, wiping typed text and selected answers | Targeted updates; unchanged data doesn't redraw |
| Teams could be removed without confirmation; stale results stayed | Confirmation prompts and cascading deletes |
| One shared scoreboard with no per-round history | Per-round scores, cumulative totals, tie-breaks (puzzles solved, then total solve time) and CSV export |
| Partial credit was lost on timeout, and only the last guess counted | Partial credit applies on timeout or attempts exhausted and uses the team's best guess |
| Repeated identical guesses wasted attempts | Duplicate guesses are blocked and the team's guess history is shown |
| Weak puzzle validation (duplicate names, empty strings, bad clue counts) | Stricter validation with clear messages; unique ids; size limits |
| No game concept: one global round | Multiple games per host, each with its own join link, settings, rounds and teams; finish-game state |
| No projector view | `#/board/<game>` big-screen leaderboard with timer and answer reveal |
| Accessibility gaps | Labelled controls, keyboard focus styles, reduced-motion support, mobile layout |

## Known limits and ideas for next steps

- Deduction-grid notes are saved on the device, not shared between teammates.
- Puzzles are added by JSON. A form-based puzzle editor would be a natural next feature.
- Puzzle clues are free text, so the app can't check that a puzzle has exactly one solution. Test new puzzles yourself.
- Supabase's free tier pauses projects after a week of inactivity, and Render's free static hosting has bandwidth
  limits. Check both before a big event.
