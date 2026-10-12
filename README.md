# Auto-Scheduler (the planner behind Achieve It)

Tasks in, organized calendar out. You enter what you owe (a title, a
deadline, roughly how long it takes) and the app finds open time on your
Google Calendar and books it. When something changes, the blocks move on
their own.

This is the planner and the shared backend for **Achieve It**. The phone app
lives in the separate `achieve-it` repo. Product direction is in
`PRODUCT_BRIEF.md`; how work is done is in `CLAUDE.md`.

## Where things stand (Phase 0.5, 2026-10-12)

- **New:** two looks, **Calm** (default, warm and soft) and **Momentum**
  (black, white, one bold color), shared with the phone app. Switch in
  **Settings, Appearance**; it changes instantly and is saved to your
  account. Every page was redesigned for both, following `DESIGN.md`.
- **Works and was checked:** installs, type-checks, lints, 60 tests pass,
  builds, and runs against a database. Adding and completing tasks works.
  Every page was looked at in both looks at phone and desktop widths
  (`docs/screens/2026-10-12-phase05-themes/`).
- **Never run yet:** Google sign-in, reading your calendar, and writing
  blocks to it. Those need Google credentials that are not set up yet.
- Full details: `docs/AUDIT.md`. Latest session report: `REVIEW.md`.

## What you need

1. **Node.js 20 or newer.** Check with `node --version`. If you don't have
   it, install the "LTS" version from nodejs.org, or with nvm:
   `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash`,
   restart the terminal, then `nvm install 22`.
2. **A Postgres database.** Neon's free tier is easiest: create a project
   and copy its connection string.
3. **A Google OAuth client** (free), for sign-in and calendar access:
   1. [Google Cloud Console](https://console.cloud.google.com/), new project.
   2. APIs & Services, Library: enable **Google Calendar API**.
   3. OAuth consent screen: External; add yourself as a test user.
   4. Credentials, Create credentials, OAuth client ID, Web application.
   5. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`.

## Set it up

```bash
cd ~/Documents/auto-scheduler
npm ci                       # install exactly what package-lock.json lists
cp .env.example .env.local   # then fill in the values (table below)
npx prisma db push           # create the tables in your database
npm run dev                  # open http://localhost:3000
```

Make each secret with `openssl rand -base64 32` (run it once per secret).

| Variable | Needed? | What it is |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | Random secret for sign-in sessions |
| `AUTH_URL` | Yes | `http://localhost:3000` locally; your real address when deployed |
| `AUTH_TRUST_HOST` | Outside Vercel | `true` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Yes | From the Google OAuth client above |
| `TOKEN_ENCRYPTION_KEY` | Yes | Random 32-byte key; encrypts Google tokens in the database |
| `CRON_SECRET` | Yes, for background re-planning | Random secret; without it the re-plan endpoint refuses every request |
| `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` | No | Turns on email sign-in links |

Never commit `.env.local`; it is ignored by git on purpose.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Run the app locally with live reload |
| `npm test` | Run the automated tests |
| `npm run typecheck` | Check the TypeScript types |
| `npm run lint` | Check code style and common mistakes (fails on any warning) |
| `npm run build` | Make a production build |
| `npx prisma db push` | Apply the database schema (Phase 0.5 added one optional column, `User.appearance`) |
| `node --env-file=.env.local scripts/seed-preview.mjs` | Fill a **local** database with two sample accounts for screenshots (refuses any non-local database) |
| `node scripts/screenshots.mjs` | Screenshots of every page in both looks (see the top of the file) |
| `node scripts/check-appearance.mjs` | Clicks through Settings, Appearance and checks the switch is instant, saved and remembered |

## How the scheduler works

`runScheduler(userId)` in `src/lib/scheduler/run.ts` does the whole job:

1. **Read busy times** from every calendar you have selected, up to the
   last deadline (at most 60 days ahead).
2. **Leave out our own blocks that have not started yet**, because those are
   what is being re-placed. Blocks that have started, including the one you
   are in right now, stay put.
3. **Work out free time per "Hours" profile**: each profile's weekly hours,
   turned into real times in your time zone, minus busy times and buffers.
4. **Place tasks** (`place.ts`): soonest deadline first, then priority; each
   task takes the earliest time that fits, split into sittings between its
   shortest and longest length.
5. **Sync to Google**: update the events already there instead of deleting
   and recreating them, so the calendar does not churn.

Worth knowing:

- **Time already spent counts.** A 6-hour task with 2 hours done only gets 4
  more hours booked.
- **The plan is in charge.** If you drag one of its blocks in Google, the
  next re-plan moves it back. Fixed commitments belong on your calendar as
  normal events; the scheduler works around them.

## Background re-planning

`vercel.json` calls `/api/cron/reschedule` every 15 minutes so changes made
in Google get absorbed. It needs `CRON_SECRET`. Changes made in the app
re-plan immediately. Note: Vercel's free plan may only allow daily timers;
see `REVIEW.md`, "Needs your decision".

## Deploying (not done yet)

Vercel, with the same environment variables. Add the production callback
URL to the Google OAuth client and set `AUTH_URL` to the deployed address.
While Google's consent screen is in "testing", only listed test users can
sign in, which is fine for a first group of classmates.

## Project layout

```
src/app/            pages and API routes (Next.js App Router)
src/components/     screen pieces (task form, week view, ...); ui.tsx is the shared kit
src/lib/theme/      the two looks: tokens.ts (same as the phone app's) -> CSS variables
src/lib/scheduler/  the scheduling logic (pure, tested) and the Google sync
src/lib/            auth, Google, encryption, validation, database
src/tests/          automated tests
prisma/             database schema
docs/               audit, decisions, ideas, privacy notes, screenshots
```
