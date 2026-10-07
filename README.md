# 🧬 GAMETOGENESIS CHALLENGE

Kahoot-style educational quiz about **human gametogenesis** for a university classroom activity.
Built with Next.js 16 + React 19 + TypeScript + Tailwind CSS + Framer Motion.

- 10 questions (100% English), 4 options each, 15-second timer.
- Points by speed: up to **1,000 per question** (`round(1000 × timeLeft / 15s)`).
- Live lobby, live leaderboard, streaks 🔥, confetti 🎉 and a Top‑3 podium.
- Designed for **27 simultaneous players** on laptops, tablets and phones.

---

## Quick start (no external services — recommended)

Mode A uses the built-in **local server** (real-time via Server-Sent Events) and saves all
results to `.data/store.json`. It works on a single computer + the classroom Wi‑Fi.

```bash
npm install
npm run dev
```

Then:

1. Open `http://localhost:3000` on the teacher computer.
2. Open `http://localhost:3000/host`, enter the host PIN: **gmhost27**.
3. Share `http://localhost:3000` with the students (same network).
   - On the school network, find the teacher PC IP with `ipconfig` and share
     `http://<ip>:3000` — e.g. `http://192.168.1.40:3000`.
4. Students enter their name → wait in the lobby → teacher presses **START GAME**.
5. After the last player answers, the **FINAL LEADERBOARD** updates automatically.

> Production build: `npm run build` then `npm run start` (faster).

### Automated logic validation

```bash
npm run test:logic   # checks the 10 questions, answer keys, shuffle, scoring and helpers
npm run lint         # ESLint (React Compiler rules included)
npm run build        # production build + type check
```

---

## Mode B: Supabase (optional, play from anywhere)

If you prefer a hosted database:

1. Create a free project at <https://supabase.com>.
2. SQL Editor → run the script in [`supabase/schema.sql`](supabase/schema.sql).
3. Replication: ensure `games`, `players`, `answers` are added to the Realtime publication.
4. Create a `.env.local` file (see [`.env.local.example`](.env.local.example)):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
GAME_HOST_PIN=gmhost27
```

5. `npm install && npm run dev` — the app auto-detects Supabase and uses Realtime.

> Changing mode at runtime: the app reads the env at boot, so restart the server after editing `.env.local`.

### Deploying to Vercel

The built-in server mode relies on a local filesystem store, which does **not** work on Vercel (read-only, ephemeral serverless filesystems). To run on Vercel you must use Mode B:

1. Create the Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) (SQL Editor).
2. In the Vercel dashboard open the project → **Settings → Environment Variables** and add (all scopes — Production/Preview/Development):

   - `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`
   - (optional) `GAME_HOST_PIN=gmhost27`

3. Redeploy (`git push`, or Deployments → Redeploy). The app auto-detects Supabase and the two `/api/game*` endpoints stop being used (no filesystem writes, live updates via Supabase Realtime).

---

## Game rules implemented

| Rule | Implementation |
| ---- | -------------- |
| 10 questions, 100% English | `src/lib/questions.ts` |
| Random question + option order every game | `prepareQuestions()` (Fisher‑Yates, correct answer preserved) |
| 15 s per question | countdown bar + colors; locks at 0 → 0 points |
| Speed scoring | `scoreForTimeLeftMs()` → max 1000 |
| Duplicate names blocked | server-side check (case-insensitive) + uniqueness |
| Max 27 players | enforced by the server stores |
| Results persisted | `.data/store.json` (mode A) or Postgres (mode B) |
| Tie-break | same score → lower total response time wins → then alphabetical |
| Ranking auto-updates | when a player finishes, positions are recomputed for everyone |
| Resume on refresh | player progress is stored; refreshing mid-game continues instead of restarting |

## Teacher checklist before the activity

- [ ] 10 questions and answers are correct (see validation below).
- [ ] Score calculation (`round(1000 × timeLeft/15)`) works as expected.
- [ ] Timer starts at 15 and blocks answers at 0.
- [ ] Answer options are shuffled and the correct one stays correct.
- [ ] A duplicate name shows the error message.
- [ ] Results are saved (check `.data/store.json` or the tables in Supabase).
- [ ] Positions and tie-breaks are computed correctly.
- [ ] The ranking shows all participants and updates live.
- [ ] Test the mobile layout with your phone.

### Expected correct answers

| Q | Answer |
| - | ------ |
| 1 | B — The formation of gametes |
| 2 | C — Testes |
| 3 | B — Ovaries |
| 4 | B — Sperm cells |
| 5 | B — Egg cell |
| 6 | B — 23 |
| 7 | A — Meiosis |
| 8 | B — Spermatogenesis produces sperm cells and oogenesis produces egg cells |
| 9 | D — 4 |
| 10 | A — It produces the gametes needed for fertilization |

---

## Project structure

```
src/
  app/
    page.tsx            # player experience (welcome → join → lobby → quiz → result → leaderboard)
    host/page.tsx       # teacher dashboard (PIN protected)
    api/game/route.ts   # game API (join/answer/finish/leaderboard/…)
    api/game/stream/    # SSE realtime stream (mode A only)
    api/host/route.ts   # host PIN check
  components/           # UI screens + shared primitives
  lib/
    questions.ts        # questions, shuffle, scoring, formatting
    supabase.ts         # Supabase client + mode detection
    server/             # localStore.ts + supabaseStore.ts
    client/             # api fetchers + realtime subscription
```

## Changing the questions

Edit `QUESTIONS` in `src/lib/questions.ts`. Keep 4 options and set `correctIndex`
(0 = A, 1 = B, 2 = C, 3 = D). The app shuffles the order automatically.