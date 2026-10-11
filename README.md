# Auto-Scheduler

Tasks in, organised calendar out. Built for students and anyone stacking
classes, shifts, and deadlines on top of each other.

You enter what you owe — a title, a deadline, roughly how long it takes — and
the app finds real open time on your Google Calendar and books it. When
something changes (a new shift, a moved class, a pushed deadline), the blocks
move out of the way on their own.

## What is built

All of the P0 must-haves from the spec, plus two P1 items that fell out of the
data model for free.

| Requirement | Where |
|---|---|
| User accounts | `src/lib/auth.ts` — Auth.js v5, Google + optional email magic link |
| Google Calendar OAuth per user | `src/lib/google.ts`, tokens encrypted at rest via `src/lib/adapter.ts` |
| Task input | `src/components/AddTaskForm.tsx`, `src/app/api/tasks/route.ts` |
| Auto-scheduling algorithm | `src/lib/scheduler/place.ts` |
| Schedule profiles | `src/lib/profiles.ts`, `src/app/(app)/profiles/page.tsx` |
| Reactive rescheduling | `src/app/api/cron/reschedule/route.ts` + a re-run on every task edit |
| Priority/deadline logic | `src/lib/scheduler/place.ts` — deadline first, then priority |
| Buffer time (P1) | per-profile `bufferMinutes` |
| "Right now" view (P1) | `src/components/NowCard.tsx` |

Not built yet: natural-language task entry, syllabus import, notifications, and
recurring tasks (spec phases 5 and 6).

## Setup

### 1. Install Node

Node is not on this machine. Without admin rights, nvm is the way in:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.zshrc && nvm install 20
```

### 2. Install dependencies

```bash
cd ~/Documents/auto-scheduler && npm install
```

### 3. Get a Postgres database

Anything Postgres works. Neon's free tier is the quickest: create a project,
copy the connection string.

### 4. Create a Google OAuth client

1. [Google Cloud Console](https://console.cloud.google.com/) → new project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **OAuth consent screen** → External → add yourself as a test user.
4. **Credentials → Create credentials → OAuth client ID → Web application.**
5. Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
   (add your production URL later).

The app asks for `calendar.readonly` (to see free/busy) and `calendar.events`
(to write blocks) — not full calendar ownership.

### 5. Fill in the environment

```bash
cp .env.example .env.local
```

Generate the two secrets:

```bash
openssl rand -base64 32
```

Run it twice — once for `AUTH_SECRET`, once for `TOKEN_ENCRYPTION_KEY`.

### 6. Create the tables

```bash
npx prisma db push
```

### 7. Run it

```bash
npm run dev
```

Sign in with Google at http://localhost:3000, then add a task. It should appear
on your Google Calendar within a few seconds.

## How the scheduler works

`runScheduler(userId)` in `src/lib/scheduler/run.ts` does the whole job:

1. **Read free/busy** from every calendar the user has selected, over a horizon
   that runs to the last deadline (capped at 60 days).
2. **Subtract our own blocks** from that busy set — they are the thing being
   re-placed, so they must not block themselves.
3. **Build availability per profile**: each profile's weekly windows expanded
   across the horizon in the user's own time zone, minus the busy set padded by
   the profile's buffer.
4. **Place tasks** (`place.ts`): sort by deadline, then priority; give each task
   the earliest open time that fits, carved into sittings between its min and
   max block size; withhold that time from everything considered after it.
5. **Sync to Google**: reconcile the plan against the events already there,
   reusing event IDs so the calendar does not churn on every run.

Two behaviours worth knowing:

- **Blocks that have already started are history.** They are never moved, and
  the time they covered counts toward the task's duration — so a 6-hour task
  with 2 hours already elapsed only gets 4 more hours booked.
- **The plan is authoritative.** If you drag an auto-scheduled block somewhere
  else in Google, the next run moves it back. Fixed commitments belong on your
  calendar as ordinary events, which the scheduler reads and works around.

`placeTasks` and the interval maths are pure functions with no calendar or
database access, so they are covered by unit tests:

```bash
npm test
```

## Reactive rescheduling

Rather than subscribing to Google's push notifications (which need a public
HTTPS endpoint and channel renewal every week), the app re-reads free/busy on a
timer. `vercel.json` runs `/api/cron/reschedule` every 15 minutes; set
`CRON_SECRET` in your Vercel project and the endpoint will reject anything else.

The scheduler also re-runs immediately whenever a task, profile, or setting
changes, so anything you do in the app is reflected at once. Only changes made
in Google wait for the next tick.

Swapping in push notifications later means adding a `watch` registration and a
webhook that calls the same `runScheduler(userId)`.

## Deploying

Vercel, with the same environment variables plus `CRON_SECRET`. Add the
production callback URL to the Google OAuth client, and set `AUTH_URL` to the
deployed origin. `npm run build` runs `prisma generate` first.

While the Google OAuth consent screen is in "testing", only the accounts you
list as test users can sign in — fine for a first round of classmates, and the
reason verification is not worth doing until there is real usage.
