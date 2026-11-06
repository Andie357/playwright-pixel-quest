# Playwright Pixel Quest

A retro pixel-art RPG **Myth or Fact** quiz for QA team training (Playwright Session 1).
The host screen-shares a dashboard (e.g. in Google Meet) while participants join anonymously
on their phones or laptops and vote in real time.

| Quest | Name              | Topic                                        |
| ----- | ----------------- | -------------------------------------------- |
| 1     | Automation Forest | Playwright Introduction                      |
| 2     | Framework Arena   | Choosing a Testing Framework                 |
| 3     | Browser Tower     | Playwright Key Features                      |
| 4     | Feature Dungeon   | Test Automation Maintenance                  |
| 5     | Final Boss        | Playwright Installation                      |

**Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Supabase (Postgres + Realtime), deployable to Vercel.

---

## How a game works

1. The host opens the app and clicks **Create room**. They get a 6-character room code, a player link, and a QR code.
2. Participants open the link (or enter the code on the home page). No account is needed, and they join anonymously.
3. The host clicks **Start adventure**. Quest 1 and its statement appear on every screen.
4. The host picks a countdown length and clicks **Start countdown**. Voting opens.
5. Participants pick **MYTH** or **FACT**, press **Submit**, and see a confirmation. Each participant gets one vote per quest.
6. The host sees how many have answered, shown as anonymous blocks with no names or answers.
7. **Reveal answer** unlocks once *everyone has submitted* or *the timer expires*. The server enforces this rule.
8. The reveal shows the Myth/Fact percentages (of submitted votes only), the community's majority (or a tie), and the correct answer with an explanation, each in its own panel.
9. The host clicks **Next quest**. After the Final Boss, **Finish adventure** shows the completion screen. Participants see their personal score.

## Project structure

```
supabase/schema.sql            Tables, RLS, triggers, game functions, Realtime publication
src/app/
  page.tsx                     Home: create or join a room
  host/[code]/page.tsx         Host dashboard
  play/[code]/page.tsx         Participant screen
  api/rooms/...                Route handlers (all writes happen here, server-side)
src/components/
  screens/                     HomeScreen, HostScreen, PlayScreen
  game/                        Timer, quest card, quest map, vote bars, QR code, enemy...
  pixel/                       Pixel landscapes (procedural SVG), sprites, buttons, panels
src/hooks/                     useRoom (Realtime + polling fallback), useCountdown
src/lib/
  quests.ts                    Public quest content (statements only)
  server/answer-key.ts         Correct answers + explanations (server-only)
  server/*                     Supabase admin client, token hashing, auth checks
```

## Architecture & security

- **Room state** lives in `public.rooms`. It contains only public information: status, current quest, timer, participant and submission counts, and results *after* they are revealed. Browsers read it with the anon key and subscribe to it through **Supabase Realtime** (`postgres_changes`).
- **Votes, participants and host tokens** live in tables with RLS enabled and **no policies**, so the anon key cannot read them. Nobody can see other people's answers, before or after the reveal. Only totals are ever published.
- **All writes** (create room, join, vote, host actions) go through Next.js route handlers that use the **service-role key on the server only**. That module imports `server-only`, so the build fails if it is ever bundled into client code. The key is never prefixed with `NEXT_PUBLIC_`.
- **The answer key** lives in a server-only module, so the correct answers never ship to the browser before the reveal.
- **Votes and reveals** run in Postgres functions that lock the room row. This makes "one vote per quest", "no votes after the timer or the reveal", and "reveal only when everyone has answered or the time is up" atomic, even with many participants voting at once.
- **Host and participant identity:** when a room is created or someone joins, the server issues a random token. The browser keeps it in `localStorage`, and the database stores only its SHA-256 hash. A participant who refreshes the page keeps the same anonymous identity and vote.
- **Timer:** the server stores `timer_ends_at`. Every client corrects for clock drift using the server time returned by the API, so all countdowns stay in sync.
- **Resilience:** if the Realtime socket drops, clients fall back to polling (every 3 s) and refresh when the tab regains focus. The header badge shows `LIVE` or `SYNCING`.

---

## 1. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor -> New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. The script is idempotent, so you can run it again safely.
   It creates the tables, Row Level Security, the game functions, and adds `rooms` to the `supabase_realtime` publication.
3. Check that Realtime is enabled for the table: **Database -> Publications -> supabase_realtime** should list `rooms`. You can also check under **Table Editor -> rooms -> Realtime: on**.
4. Collect your keys from **Project Settings -> API / API Keys**:
   - Project URL
   - `anon` public key (or the newer **publishable** key)
   - `service_role` key (or the newer **secret** key). Keep this one private.

No Supabase Auth configuration is needed. Participants are anonymous, and the app never uses Supabase Auth.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

| Variable | Where it is used | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser (Realtime) + server | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | Browser, read-only Realtime | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) | **Server only** (route handlers) | Yes |
| `NEXT_PUBLIC_SITE_URL` | Player link / QR code base URL | Optional (defaults to the current origin) |

> Never put the service-role key in a `NEXT_PUBLIC_*` variable.

## 3. Local development

Requirements: Node.js 20.9+ (tested with Node 22) and npm.

```bash
npm install
cp .env.example .env.local   # then edit the values
npm run dev
```

Open <http://localhost:3000>:

- Click **Create room**. You land on the host dashboard at `/host/ABC123`.
- Open the player link `/play/ABC123` in another browser, an incognito window, or your phone. Each incognito window counts as a separate participant.
- To test from a phone on the same Wi-Fi, use the "Network" URL printed by `next dev` (e.g. `http://192.168.x.x:3000`), or set `NEXT_PUBLIC_SITE_URL` so the QR code points there.

Other scripts:

```bash
npm run lint    # ESLint
npm run build   # production build (type-checks too)
npm start       # serve the production build
```

## 4. Deploy to Vercel

1. Push the project to a Git repository (GitHub, GitLab, Bitbucket, or Cursor).
2. In Vercel, click **Add New -> Project**, import the repository, and keep the defaults (Framework: Next.js; build command `next build`).
3. Under **Settings -> Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `NEXT_PUBLIC_SITE_URL=https://<your-app>.vercel.app`.
4. Deploy. If you change a `NEXT_PUBLIC_*` variable later, redeploy, because those values are inlined at build time.

Or from the CLI:

```bash
npm i -g vercel
vercel           # link + preview deploy
vercel env add SUPABASE_SERVICE_ROLE_KEY   # repeat for each variable
vercel --prod
```

## Running a session (host tips)

- Create the room a few minutes early. Share your screen, and leave the lobby (with its big code and QR code) up while people join.
- The dashboard is laid out for 1080p screen sharing: large statement text, high-contrast panels, and the join link always visible in the header, so latecomers can join mid-game.
- Keep the host tab open in the same browser: the host key is stored there. If you open the host URL in another browser, it will tell you it isn't the host.
- Rooms keep working after a page refresh, for both the host and participants.

## Customising the quiz

- Statements, quest names, topics and flavour text: `src/lib/quests.ts`
- Correct answers and explanations: `src/lib/server/answer-key.ts` (keyed by quest `id`)
- Countdown presets: `TIMER_OPTIONS` in `src/lib/quests.ts`
- Scenes per quest: `theme` on each quest. The scenes are drawn in `src/components/pixel/PixelLandscape.tsx`.

If you add or remove quests, `quest_count` is set automatically when a room is created.

## Housekeeping

Old rooms can be removed at any time. Deleting a room cascades to its participants and votes:

```sql
delete from public.rooms where created_at < now() - interval '2 days';
```

You can schedule this with the `pg_cron` extension in Supabase.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Setup needed" screen | Environment variables are missing on the server. Check `.env.local` or the Vercel env vars, then restart or redeploy. |
| Header shows `SYNCING` instead of `LIVE` | Realtime isn't connected. Make sure `rooms` is in the `supabase_realtime` publication and the anon key is correct. The game still works through polling. |
| `permission denied for table ...` in server logs | Re-run `supabase/schema.sql`. It grants the required privileges to `service_role`. |
| "Host only" message | This browser doesn't hold the host key for the room. Use the browser that created the room, or create a new room. |
