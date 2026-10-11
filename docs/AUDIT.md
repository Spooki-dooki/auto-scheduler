# Phase 0 audit: auto-scheduler (the planner and shared backend)

Date: 2026-10-11. Branch: `phase-0`.

Plain-language summary: **the code is solid and mostly well built, but the
part that matters most (Google sign-in, reading your calendar, and writing
blocks back) has never been run by anyone, including me.** I can't run it
here because there are no Google credentials. Everything that does not need
Google now installs, type-checks, lints, passes its tests, builds, and runs.

Status words below: **verified** = I ran it and saw it work. **Partially
verified** = some of it ran. **Not verified** = could not run here.

---

## 1. What works (verified)

| Check | Result | How |
|---|---|---|
| Clean install | Works | `rm -rf node_modules && npm ci` |
| Typecheck | 0 errors (after one fix) | `npm run typecheck` |
| Lint | 0 errors, 0 warnings (lint was never set up; now it is) | `npm run lint` |
| Tests | 34 passing in 5 files | `npm test` |
| Production build | Works with no secrets set | `npm run build` |
| Database schema | Valid; creates all 8 tables in Postgres 16 | `npx prisma db push` against a local throwaway database |
| The running app | Pages load, signed-out users are sent to sign-in, APIs reject anonymous requests (401), bad input gets a clear error (422) | `next start` + a local database + a test login session I inserted directly |
| Add a task in the UI | Saved; shows in the list; stays "pending" because no calendar is connected | Playwright, screenshot `docs/screens/2026-10-11-phase0-baseline/04-*` |
| Complete a task | Moves to "Done" | Playwright, screenshot `05-*` |
| Sign out | Deletes the session in the database | Seen while testing |
| "Re-plan now" with no Google | Returns a clear "no Google Calendar connected" error (409), no crash | API call |
| Background re-plan endpoint | Refuses requests without the secret (403); runs with it | `curl` |
| Token encryption | Round-trips, uses a fresh IV each time, rejects tampering | `src/tests/crypto.test.ts` |
| Phone width | No horizontal scrolling on any screen at 390px | Measured by the Playwright run |

## 2. What was broken, and is now fixed (this session)

1. **Typecheck failed** in the Auth.js adapter that encrypts Google tokens
   (a type mismatch caused by two copies of the auth library). Fixed.
2. **Lint was never configured.** `npm run lint` stopped at an interactive
   question. Set up ESLint with the Next.js rules, zero-warning policy, and a
   ban on `console.log`.
3. **Critical security advisories in the auth library** (`next-auth`
   5.0.0-beta.25), including one where sign-in checks could "fail open" on a
   configuration error. Upgraded to beta.32. Also patched Next.js and other
   packages within their current versions. Criticals: 4 before, 0 now.
4. **A block you were in the middle of could be moved.** When the 15-minute
   background re-plan ran during a session, the scheduler treated the running
   block as movable and pushed it to a later slot, while also counting its
   time as done. The README promised the opposite. Fixed, with tests.
   (Not verified end-to-end, because that needs Google.)
5. **The background re-plan endpoint was open to anyone** if `CRON_SECRET`
   was not set, and its reply listed user IDs. It now refuses to run without
   the secret.

## 3. Found and not fixed (for Phase 1)

### High

- **Google sign-in, calendar reading, and writing blocks have never run.**
  Treat all of `src/lib/google.ts` and `src/lib/scheduler/run.ts` as unproven.
- **"Reconnect Google Calendar" cannot repair broken access.** I read the
  auth library's code: when a Google account that is already linked signs in
  again, it keeps the old tokens and discards the new ones. If a user revokes
  access or a token stops working, reconnecting will not help.
- **Revoked Google access shows up as "Something went wrong"**, not "reconnect
  your calendar". The "reauth required" error exists but is never raised for
  this case.
- **First run is far over the friction budget.** Today: landing page, sign in
  with Google, Google's consent screen, then an empty dashboard with a form.
  No sample week, no instant plan, no "try without connecting". (Phase 2 owns
  the first-run flow; noting it so it isn't forgotten.)
- **The design does not meet the brief.** Light mode only (asking for dark
  mode still renders light), Tailwind's default indigo accent, generic white
  bordered cards, the main action (add a task) sits at the bottom of the page
  on a phone, and several tap targets are under 44pt (duration chips, the
  checkbox, text links). The Hours page is 26 rows of time pickers on a
  phone. Baseline screenshots are in `docs/screens/2026-10-11-phase0-baseline/`.
- **No account deletion.** Required by the App Store once accounts exist.

### Medium

- **A task can be attached to another user's "Hours" profile** by sending
  that profile's ID; the task list would then show that profile's name and
  color. Needs an ownership check in the task create/update routes.
- **An invalid time zone is accepted** in Settings and would silently make
  the scheduler find no free time at all.
- **Error logs may include task titles.** Route and cron errors log whole
  Google error objects, which can carry the request body (the event title).
  The brief says never log event contents. Not verified; needs a test.
- **Vercel may not run the 15-minute re-plan on a free plan.** As I
  understand Vercel's rules, the free plan only allows once-a-day cron jobs,
  so this `vercel.json` would fail to deploy there. I could not check this
  from here (no network to Vercel). See "Needs your decision" in `REVIEW.md`.
- **No database migrations.** The schema is applied with `prisma db push`,
  which is fine now but risky once real data exists.
- **Copy and tone.** The task list labels late items "overdue" and shows
  amber "could not be fitted" banners; the brief asks for no overdue piles.
  The product name "Auto-Scheduler" is hard-coded in several places instead
  of one constant. Delete has no confirmation or undo.
- **No per-user rate limits** on any route. Each task edit triggers a full
  Google re-plan.

### Low

- `allowDangerousEmailAccountLinking` is on for Google. Acceptable while
  Google is the only sign-in, worth revisiting when Apple sign-in is added.
- 14 remaining `npm audit` findings (0 critical). The ones that ship in the
  app need major upgrades (Next.js 16, googleapis 185); the rest are
  developer tools (ESLint plugins, the Prisma CLI). Listed in `DECISIONS.md`.
- The checkbox does not tick until the server answers (about a second), so
  completing a task feels laggy.

## 4. Not run here, and why

| Thing | Why not |
|---|---|
| Google sign-in and consent | No Google OAuth client ID/secret |
| Google Calendar free/busy, creating/moving/deleting events | Same |
| Scheduler end-to-end (`runScheduler`) | Needs Google; only its pure parts are tested |
| Email magic-link sign-in | No Resend key (it is optional and hidden without one) |
| Deploying to Vercel and its cron | No Vercel account or network access to it |
| Neon (hosted Postgres) | No database URL; I used a local Postgres instead |

## 5. Tests: what is covered and what is missing

Covered: interval math (merge, subtract, intersect, pad), weekly hours to
real times including an overnight shift and a DST change, task placement
(earliest fit, deadline order, priority ties, chunking, buffers, no
double-booking, shortfall reporting, past deadlines, profiles with no hours),
the started/upcoming split, and token encryption.

Missing (CLAUDE.md requires these; Phase 1): property tests over random
calendars (no overlaps, fixed events never moved, deadlines met when
possible, same input gives same output), DST and midnight-crossing cases in
placement, all-day events, mocked Google responses (rate limits, expired and
revoked tokens, deleted and duplicate events), and Playwright end-to-end
tests checked into the repo.
