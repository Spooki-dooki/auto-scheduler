# Decisions

Each entry: what was decided, why, and what else was considered. Newest
decisions are added at the end of their section. "Needs Justin" means it is
a recommendation only and has not been acted on.

## Planner decisions (this repo)

### P-1. Lint with ESLint 9 and the Next.js rules, zero warnings allowed (2026-10-11)

- **What:** `eslint.config.mjs` (flat config) using `eslint-config-next`
  15.5.25 (matches Next.js 15.5), `npm run lint` fails on any warning, and
  `console.log` is banned (`console.error`/`console.warn` allowed for real
  failures).
- **Why:** `next lint` is deprecated, and with no ESLint installed it stopped
  at an interactive prompt, so lint had never run.
- **Alternatives:** Biome (fast, one tool for lint and format, but loses the
  Next.js and React hooks rules); keeping `next lint` (removed in Next 16).

### P-2. Upgrade `next-auth` to 5.0.0-beta.32, pinned exactly (2026-10-11)

- **What:** from beta.25 to beta.32, written as an exact version.
- **Why:** beta.25 had critical security advisories that would ship to
  production. beta.32 is the same major line, and it also removed a second
  copy of `@auth/core` that caused the typecheck failure. Exact pin because
  pre-release auth libraries can change behavior between betas.
- **Alternatives:** staying on beta.25 (unsafe); moving to a different auth
  library (bigger change, no benefit yet; see X-2).
- **Verified:** typecheck, build, signed-out redirects, session-based pages,
  sign-out. **Not verified:** Google sign-in itself (no credentials).

### P-3. Accept the remaining `npm audit` findings for now (2026-10-11)

- **What:** 14 findings remain (5 moderate, 9 high, 0 critical). Shipped in
  the app: `next` (moderate; the fix is Next 16), the PostCSS copy bundled by
  Next (same), `googleapis` and its `gaxios`/`uuid` (moderate; fix is
  googleapis 185). Developer tools only: `eslint-config-next` and its
  `braces`/`micromatch`/`fast-glob`, and the Prisma CLI's `@prisma/config`/
  `deepmerge-ts`.
- **Why not fix now:** each needs a major upgrade, and the code paths they
  affect (Google calls, page rendering) cannot be tested here without
  credentials. Next.js's advisory is about cached static pages on
  self-hosted servers; every page here is dynamic and the target is Vercel.
- **Plan:** Next 16 and googleapis 185 early in Phase 1, once Google calls
  can be tested end to end.

### P-4. vitest 2 to 5 (2026-10-11)

- **What:** dev-only upgrade, plus `vite` 8 as its required companion.
- **Why:** vitest 2 and its dependencies had critical advisories. Tests are
  plain and passed unchanged.

### P-5. A block that has started is never moved (2026-10-11)

- **What:** one helper (`splitAtNow` in `src/lib/scheduler/history.ts`)
  decides which blocks are history (started, including running now) and
  which are up for re-placement (not started yet). The scheduler's busy set,
  its "time already spent" count and the calendar sync all use it.
- **Why:** they disagreed, and a running block got moved by the background
  re-plan. The README already promised this behavior.
- **Alternatives:** ending the running block at "now" and re-placing the
  rest (more accurate when someone stops early, but that is really the
  "learns durations" feature and needs product decisions).

### P-6. The re-plan endpoint fails closed (2026-10-11)

- **What:** `/api/cron/reschedule` returns 503 unless `CRON_SECRET` is set,
  and 403 unless the request carries it.
- **Why:** before, a missing secret meant anyone could trigger a re-plan for
  every user and read back the user ID list.

### P-7. How Phase 0 checked the running app without Google (2026-10-11)

- **What:** a local Postgres database, a test user and a login session
  inserted directly into the database, and a Playwright script driving the
  real production build. Screenshots in `docs/screens/2026-10-11-phase0-baseline/`.
- **Why:** proves pages, API routes, validation and the database work, while
  being honest that Google-dependent parts were not run.
- **Next:** Phase 1 adds Playwright to the repo as real end-to-end tests
  instead of a one-off script.

### P-8. Database changes go through migrations before real users (proposed, 2026-10-11)

- **What:** switch from `prisma db push` to `prisma migrate` (checked-in
  migration files) before any real user data exists.
- **Why:** `db push` can drop columns when the schema changes; migrations
  are reviewable and repeatable.
- **When:** Phase 1, before connecting a hosted database used by anyone.

## Phase 0.5 decisions: design system and theme switch (2026-10-12)

### P-9. Tokens in one file, turned into CSS variables

- **What:** `src/lib/theme/tokens.ts` holds DESIGN.md's colors, type,
  radii and sizes (the same file as the phone app's, apart from comments).
  `css.ts` turns them into one block of CSS variables per theme and accent
  (`[data-theme="momentum"][data-accent="crimson"] { --accent: ... }`),
  inlined by the root layout. `globals.css` maps the variables to Tailwind
  utilities (`bg-ground`, `text-soft`, `rounded-card`, `t-heading`) and
  writes no color itself.
- **Why:** one source per app; switching theme is changing two attributes;
  any element can carry its own theme, which is how the Appearance
  previews show the other one with the real classes.
- **Alternatives:** two hand-written CSS files (drift); a CSS-in-JS
  library (more dependencies for the same result).
- **Verified:** 26 new tests (contrast for every pair in both themes and
  all six accents, the stylesheet, the cookie), screenshots of every page
  in both themes at 375, 430 and 1280.

### P-10. Appearance is saved on the account, cached in a cookie

- **What:** a nullable `User.appearance` JSON column (added with
  `prisma db push`; a new optional column, nothing existing changes).
  `PATCH /api/appearance` saves it and sets an `appearance` cookie; the
  root layout reads the cookie so the first paint is already in the right
  theme. If the account and the cookie disagree (a new device), the
  account wins and the cookie is refreshed.
- **Why:** DESIGN.md: "persists per user (synced to the account, cached
  on device)". The phone app will read the same column once it signs in
  (X-2).
- **Switch:** instant; the View Transitions API crossfades it in 200 ms
  where the browser supports it, and it switches instantly with reduced
  motion.

### P-11. Fonts with next/font, self-hosted

- Bricolage Grotesque, Hanken Grotesk, Barlow, Barlow Condensed, only the
  weights used. Downloaded at build time and served from our own domain;
  nothing is requested from Google when someone opens a page. Type sizes
  are in rem, so the browser's text-size setting scales them.

### P-12. Navigation: sidebar on wide screens, tab bar on phones

- DESIGN.md: "side navigation that collapses to the same destinations on
  phones". The three existing destinations (Schedule, Hours, Settings) are
  unchanged; on phones they sit in a bottom bar drawn like the phone
  app's (Calm pill with icons, Momentum caps with an accent underline).
- On the Schedule page, "Add a task" now comes first on phones (it was at
  the very bottom, under the whole week and task list). Wide screens keep
  it beside the week.

### P-13. Copy and color changes that came with the restyle

- No red or amber for late or unfitted tasks, no red "High" tag: words
  and an icon instead. "overdue" became "due date passed". Delete asks
  first (it deleted on one tap).
- The product name comes from one constant, `APP_NAME` in
  `src/lib/copy.ts`, set to "Achieve It", the merged product's working
  name; it said "Auto-Scheduler" in three places.
- Profile ("Hours") colors stay as they are: they are the user's own
  category colors, shown only as small dots.
- **Bug fixed on the way:** a deadline earlier today, or late yesterday,
  read "today" (the day count was rounded toward zero).

### P-14. Icons from lucide-react; Playwright as a dev dependency

- lucide-react: one consistent outline icon set on the web (the phone
  uses SF Symbols). Playwright 1.56.1 runs `scripts/screenshots.mjs` and
  `scripts/check-appearance.mjs`; `scripts/seed-preview.mjs` fills a
  **local** database with two sample accounts (it refuses to run against
  anything but localhost). Phase 1 turns these into real end-to-end tests.

## Phase 0.5 review fixes (2026-10-12, asked for by Justin)

### P-15. Scheduling no longer waits for a calendar

- **Before:** with no Google Calendar connected, the planner saved tasks
  but placed nothing, and the screen said so in a big banner, while other
  lines on the same screen promised the opposite.
- **Now:** with no calendar, a re-plan treats the user's own hours as free
  and places tasks right away. Blocks are kept in our database only
  (`synced: false`, no Google event). Connecting later puts them on the
  calendar on the next re-plan: the connected path already creates events
  for blocks that have none. One quiet line says "Connect your calendar so
  I can avoid your classes and events."
- **How:** the pure planning step is split out of `runScheduler`
  (`planSchedule`, `reconcileBlocks` in `src/lib/scheduler/run.ts`) and
  tested with no database or Google (`src/tests/no-calendar.test.ts`);
  `scripts/check-no-calendar.mjs` checks it end to end on a local build.
  `src/tests/copy.test.ts` fails if any screen says scheduling needs a
  calendar.
- **Limits:** the 15-minute cron still only re-plans connected accounts
  (nothing external changes for the others). Without a calendar the plan
  can land on top of a class; that is what the line asks the user to fix.

### P-16. Schedule layout on phones: the plan first

- Order on phones: now/next, the week, a single "Add something…" field,
  then tasks. The field opens downward on tap, so it never moves under the
  thumb (and never slides behind the tab bar). The source order matches
  the visual order, so keyboard and screen-reader order do too. Wide
  screens keep the form open beside the week.
- Momentum shows minutes left and hours planned as its big numeral and
  greets with the date; Calm keeps sentences. Same facts in both, so the
  switch rule holds.

### P-17. Hours: one line per day

- "Mon · 9:00 AM – 5:00 PM" (or "Off") per day, opening an inline editor
  for that day. Replaces rows of day picker + two time pickers that wrapped
  badly on phones. Same data and API. Save is the main button only when
  something changed, and then it stays in view (a bar above the phone tab
  bar) while you edit. Leaving with unsaved hours asks first, whether you
  close the tab or follow a link inside the app. Name, color and gap fold
  away under one line.

### P-18. Logs get an error's name and first line, never the object

- Google client errors carry the request (with the Authorization header);
  Prisma errors can echo the arguments of the failed query (stored tokens).
  `src/lib/log.ts` is the only thing logged; a test fails if an error
  object is passed to `console`. Google's 401 now answers 409 "reconnect"
  instead of 500.

### P-19. Second review round (same day)

- The re-run design review and audit found new issues; all fixed:
  - **Deadline words:** "in 2 days" for tomorrow. Counted 24-hour
    periods; now calendar days in the user's zone. This was an older bug.
  - **Settings hydration error:** it happened whenever the browser's time
    zone differed from the server's.
  - **Momentum:** selected text was invisible.
  - **Large text:** values clipped at 200% text once a form was opened.
  - **Focus:** it was lost when a button removed itself.
  - **"Remove these hours":** its name didn't match its visible words.
- **First screen of a new account:** no Re-plan button (it had nothing to
  do), no "0 open tasks", and no empty task list repeating "nothing".
- The bigger asks (edit a task in place, show busy time in the week,
  one-line entry) are ideas 8–10 in `docs/IDEAS.md`, for Phase 1–2.

## Cross-cutting decisions (brief section 12)

This section is kept identical in both repos until they are merged.

### X-1. Shared backend: the Next.js app becomes the API for web and phone

- **Status:** agreed with the brief. Not implemented yet (Phase 2).
- **What:** `auto-scheduler` stays the single backend. The Expo app stops
  having its own server code and calls the Next.js API.
- **Why:** one user table, one copy of the scheduler, one place for secrets,
  rate limits and spend caps.

### X-2. Mobile auth: short-lived access token + rotating refresh token, issued by our backend (recommendation, not built)

- **Status:** recommended. Needs Justin's OK before Phase 2 (see `REVIEW.md`).
- **The problem:** Auth.js (web sign-in) works with browser cookies. A phone
  app needs tokens it can send with each request, tied to the same `User`
  table.
- **Recommendation:**
  1. **Web keeps Auth.js as it is** (database sessions, Google sign-in).
  2. **Phone signs in with Sign in with Apple** (`expo-apple-authentication`)
     **or Google**. Apple returns a signed identity token; the app sends it
     to `POST /api/mobile/auth/apple`, the backend checks it against Apple's
     public keys, finds or creates the `User`, and stores an `Account` row
     with `provider: "apple"` (same tables Auth.js already uses).
  3. **Google on the phone goes through the backend's own Google flow**, in
     the system sign-in sheet (`expo-web-browser`). The backend must hold the
     Google refresh token anyway, because it reads and writes the calendar
     while the phone is asleep. When that flow finishes, the backend
     redirects to `achieveit://auth?code=...` with a one-time code, and the
     app swaps the code (plus a PKCE verifier) for tokens.
  4. **Tokens the backend issues:** an access token (a signed JWT, about 15
     minutes, kept in memory) and a refresh token (random, about 60 days,
     kept in the iPhone Keychain via `expo-secure-store`). The backend stores
     only a hash of each refresh token in a new `MobileSession` table, swaps
     it for a new one on every use, and if an old one is ever reused it
     cancels that whole sign-in (theft detection). Signing out or deleting
     the account deletes the rows.
  5. **One helper for every API route:** `requireUserId()` accepts either the
     Auth.js cookie (web) or `Authorization: Bearer <access token>` (phone).
  6. **Sign in with Apple is required** by App Store rules when an app offers
     Google sign-in, so it is in from day one. It also needs an Apple
     Developer account, which TestFlight needs anyway.
  7. **Account deletion** deletes the user (the database cascades), revokes
     the Google token, and calls Apple's token-revocation endpoint (Apple
     requires that for apps with Sign in with Apple).
- **Alternatives considered:**
  - *Reuse the Auth.js cookie inside the app:* fragile cookie handling on
    native, no clean way to sign in with Apple natively. Rejected.
  - *Replace Auth.js with Better Auth* (has an Expo plugin): reasonable, but
    swaps the web sign-in that already exists; more churn for the same
    result. Worth reconsidering only if building X-2 by hand gets messy.
  - *Clerk, Supabase Auth, Firebase Auth:* adds a third-party service that
    receives user data and may cost money; the brief says to ask first.
    Not recommended.
  - *Long-lived API keys per device:* simplest, but a stolen key works
    forever. Rejected.

### X-3. Repo structure: one monorepo with a small shared package (recommendation, not done)

- **Status:** recommended. Needs Justin's OK, because it moves both repos.
- **Recommendation:** one repository using npm workspaces. No Turborepo or
  Nx; plain workspaces are enough.

  ```
  achieve-it/                  (new combined repo)
    apps/web/                  today's auto-scheduler (Next.js, Prisma)
    apps/mobile/               today's achieve-it (Expo)
    packages/core/             shared TypeScript, no React, no Node-only code:
                                 types (Task, Block, Window, Schedule, Goal),
                                 Zod schemas for every API request/response,
                                 pure logic used by both sides (interval math,
                                 windows, streaks, friction tiers) + its tests
  ```
- **Why:** the brief asks for shared types without copy-paste. There is
  already duplication: both repos have their own `Interval` type and their
  own interval-merging code. One pull request can then change the API and
  the phone client together, and one CI run checks both. Expo SDK 57 and
  Next.js both support workspaces without special setup.
- **How it would be done without losing history:** create the new repo,
  bring each existing repo in under `apps/` with
  `git merge --allow-unrelated-histories` (keeps every commit; no history
  rewriting, no force-push), then move shared code into `packages/core`.
  The old repos stay as read-only archives.
- **Alternatives considered:** two repos plus a published npm package
  (version bumps and publishing for every type change: too much ceremony for
  one developer); git submodules (painful); keep copy-pasting (drifts, and
  already has); generating a client from an OpenAPI spec (more machinery
  than needed today).
- **Risks:** Metro (Expo's bundler) and dependency hoisting in workspaces;
  Vercel and EAS Build each need their app folder set as the root. Both are
  documented, ordinary setups.

### X-4. AI calls live on the server only

- **Status:** agreed; partly true today.
- **Today:** the roadmap call runs in an Expo API route
  (`achieve-it/app/api/roadmap+api.ts`). I checked the built phone and web
  bundles: the prompt and the key name are not in them. But that route has
  no sign-in check, no rate limit and no spend cap, so it must not be
  deployed as is.
- **Decision:** in Phase 2, move it into the Next.js backend behind the same
  sign-in as every other route, with per-user daily limits and a global
  monthly spend cap. Use `claude-opus-5-5` (the current default model),
  structured output validated with Zod, and the offline templates as the
  fallback (already built and tested in the browser).

### X-5. Offline: the phone's Today screen loads from its own copy first

- **Status:** agreed; the phone app already stores everything on the device
  (AsyncStorage) and works fully offline today.
- **Decision for Phase 2:** keep a cached copy of the last schedule on the
  phone, show it immediately, refresh in the background, and say "Last
  updated 9:40" when offline instead of a spinner or an error.

### X-6. Goals, identity and roadmap steps live in the backend, on the same task table

- **Status:** agreed; not built.
- **Decision:** add `Goal` (objective, identity, identity predicate) to the
  Postgres schema, owned by `User`. Roadmap steps become ordinary `Task` rows
  with a `source: "roadmap"` marker, the two-minute `starter` text, and a
  link to their goal, so the planner can schedule them like any task. The
  phone's local copy becomes a cache of the server's.

### X-7. Time zones: one rule for both apps

- **Status:** decided; to apply when the code is shared.
- **Problem found:** the planner does all its math in the account's time
  zone (`User.timeZone`, using Luxon). The phone app's window logic uses
  whatever zone the phone is set to. They disagree while traveling.
- **Decision:** shared logic takes the time zone as an explicit argument
  (the account's zone). The phone offers to update the account zone when it
  notices the device zone changed.

### X-8. Both apps use the same tokens (done by copy; share them later)

- **Status:** done for Phase 0.5. `achieve-it/src/theme/tokens.ts` and
  `auto-scheduler/src/lib/theme/tokens.ts` hold the same values (only
  their header comments differ), and both apps test them for contrast.
- **Next:** with the monorepo (X-3), move `tokens.ts`, `contrast.ts`, the
  appearance setting and their tests into `packages/core` unchanged (they
  have no React Native or Next.js imports). Until then, a change to one
  must be made to the other.

