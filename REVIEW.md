# Session report: 2026-10-11

Phase 0 only (verify what exists). This report is identical in both repos.
Branch: `phase-0` in each. Details: `docs/AUDIT.md` in each repo.

## What changed (3-5 bullets, plain words)

- **Both apps now install, type-check, lint, pass tests and build from a
  clean start.** The phone app had never been compiled; it needed 2 type
  fixes, 3 missing packages, and one bad config file that broke every build.
- **The phone app moved to Expo SDK 57.** On the old SDK 54, the iPhone
  Expo Go app couldn't open it at all.
- **Real tests: 75 in the phone app (it had none) and 34 in the planner
  (was 25).** Tests, the new linter and the browser run found 5 logic bugs
  in the phone app and 1 in the planner; all fixed. Worst ones: around daylight saving, a Monday 7 PM window landed
  on Tuesday at 6 PM; a brand-new user was told "Two days off"; the planner
  moved the block you were in the middle of.
- **Security:** the planner's sign-in library had critical advisories
  (upgraded, 0 critical left in either repo); the background re-plan
  endpoint was open to anyone (now locked).
- **Docs:** an audit, decisions (including my mobile sign-in and one-repo
  recommendations), ideas, privacy notes and an accurate README in each.

## Verified (things I ran and saw work, with the command or screenshot)

- From scratch, planner: `npm ci`, `npm run typecheck`, `npm run lint`,
  `npm test` (34 pass), `npm run build`, all succeed.
- From scratch, phone app: `npm ci`, typecheck, lint, `npm test` (75 pass),
  `npx expo export` for iPhone, Android and web, all succeed;
  `npx expo-doctor` 19 of 21 (the other 2 need Expo's servers).
- Planner running against a local test database: pages, sign-out, adding
  and completing a task, clear errors for bad input and for "no calendar
  connected". Screenshots: `auto-scheduler/docs/screens/2026-10-11-phase0-baseline/`.
- Phone app in a browser, at 375px and 430px: the whole first run, Today,
  two gate unlocks (wait goes 15s then 30s, both say "10m"), logging the
  two-minute start, all tabs, no sideways scrolling.
  Screenshots: `achieve-it/docs/screens/2026-10-11-phase0-web-preview/`.
- The API key and the AI prompt are not inside the iPhone, Android or web
  app bundles (searched the built files).
- Each new bug test fails on the old code and passes on the new code.

## Not verified (things I could not run or check, and why)

- **The phone app on a real phone** (no simulator or device here):
  notifications, calendar reading, haptics, data surviving a restart,
  opening Instagram after the gate.
- **Anything needing Google** (no Google credentials): sign-in, reading
  your calendar, writing blocks, the full scheduler run.
- **AI roadmaps** (no Anthropic key). The no-key fallback works.
- **Vercel deploy and its 15-minute timer**, **Neon**, **email sign-in**:
  no accounts or network access to them.
- 2 `expo-doctor` checks: this sandbox blocks Expo's servers.

## Bugs and risks found (including mistakes in earlier work)

Still open, most important first:

1. **Planner: "Reconnect Google Calendar" can't fix broken access.** The
   sign-in library throws away new tokens for an already-linked account (I
   read its code to confirm).
2. **Phone: "Open Instagram" after the gate will probably never work on
   iPhone** (the app doesn't declare those links to iOS). Needs your phone.
3. **Phone: the AI roadmap route has no sign-in, rate limit or spend cap.**
   Must not be deployed as is; it moves to the backend in Phase 2.
4. **Phone: two privacy lines are untrue.** "Everything stays on this
   device" and "Only your goal text is sent": the identity statement is
   sent too.
5. **Both first runs are well over the friction budget**, and the web app
   doesn't follow the design rules yet (light only, default indigo,
   generic cards, small tap targets).
6. Planner: a task can point at another user's "Hours" profile; a bad time
   zone silently schedules nothing; error logs may contain task titles; no
   account deletion; no database migrations.

Earlier work I corrected: the README claimed running blocks are never
moved (they were); the phone README claimed Level 1 was "Working" (it had
never run); the window code's own comment promised past-midnight closes on
the right day (they weren't).

## Friction check (taps/inputs to first value now; was it better or worse?)

- **Phone app:** at least 2 typed answers (or 2 example taps) plus 6 taps
  across 5 screens before Today. With AI turned on, the roadmap can also
  take up to 60 seconds. Budget: 3 inputs, under 60 seconds.
- **Planner:** sign in with Google (3 to 4 taps including Google's screens),
  then type a task and tap "Add" before anything is scheduled: about 6 to 7
  actions, and nothing happens without a calendar.
- **Same as before.** Phase 0 changed no flows. Phase 2 rebuilds first run.

## Needs your decision (max 3, each with my recommended default)

1. **Combine both repos into one?** Recommended: **yes**, as the first step
   of the next phase. Bring `auto-scheduler` into the `achieve-it` repo as
   `apps/web`, the phone app as `apps/mobile`, plus a small shared
   `packages/core`. Every commit is kept, nothing is force-pushed, and
   `auto-scheduler` is archived afterwards. (Say if you'd rather use a new,
   neutral repo name since the product name isn't final.) Details: X-3 in
   `docs/DECISIONS.md`.
2. **How the phone signs in.** Recommended: **our backend issues its own
   short-lived tokens; Sign in with Apple plus Google; no third-party login
   service.** Sign in with Apple is required by the App Store and needs the
   Apple Developer Program ($99 a year), which TestFlight needs anyway.
   Details: X-2.
3. **Background re-planning may need a paid Vercel plan.** As I understand
   it (couldn't check from here), Vercel's free plan only runs timers once a
   day. Recommended: **don't pay**; use Google's "this calendar changed"
   notifications plus one daily safety run (Idea 5 in the planner's
   `docs/IDEAS.md`). Please glance at Vercel's plan page when you set up
   the project.

## 15-minute review for you (exact steps: what to open on your phone, what to tap,
## what to look for, and what "good" looks like)

**Setup on your Mac (5 min, once).** If `node --version` fails, install
the LTS version from nodejs.org first. Then in Terminal:

```bash
cd ~/Documents/achieve-it && git fetch && git checkout phase-0 && npm ci && npx expo start
```

**On your iPhone (8 min).** Install **Expo Go** from the App Store. Start
a screen recording (Control Center), then point the Camera at the QR code
in Terminal and tap the banner.

1. Tap **Start**, tap the example **"Finish the semester with a 4.0"**,
   tap **Continue**. Tap **"finishes what they start"**. Good: the card says
   "A person who finishes what they start doesn't open Instagram right now."
   Tap **Continue**.
2. Roadmap: good = 6 steps appear right away with a "BUILT OFFLINE" note
   (expected: no AI key). Tap **This works**, then **Continue**.
3. Tap **Allow** on Notifications, then on Calendar. Good: iOS asks each
   time, and the explanations make sense. Tap **Finish setup**.
4. Today: good = the streak card says **"No streak yet. One step starts
   it."** Check the tab names at the bottom (Today, Roadmap, Insights,
   Settings) are fully visible; they looked cut off in my browser test.
5. Tap **Instagram** (between 7:00 and 7:30 PM it is open on purpose; use
   TikTok instead). Tap **Open anyway**, wait 15 seconds. Good: "10m of
   Instagram". Tap **Open Instagram** and tell me what happens. I expect
   "Couldn't launch Instagram directly" (known issue 2).
6. Tap **Actually, never mind**, then **TikTok**, **Open anyway**. Good: the
   wait is **30 seconds** this time, and the cleared screen still says
   **10m**.
7. Tap **I did the two-minute version**. Good: the streak shows 1 and the
   phone gives a small buzz.
8. Close Expo Go completely (swipe it away), reopen it, and open the
   project again. Good: your goal and streak of 1 are still there.

**Then (2 min):** send me the recording, plus anything that felt slow,
confusing or ugly. The web planner can't be tried yet (it needs Google
set up); its current screens are in `auto-scheduler/docs/screens/`.

## Next session will do

Only after you say go, and after your answers above:

1. Combine the repos (if you say yes).
2. **Phase 1, the planner core:** Google connect end to end, fix
   "Reconnect", a clear "reconnect your calendar" message, the ownership
   and time-zone checks, safe logging, scheduler property tests, tests
   against recorded Google responses, Playwright tests in the repo,
   migrations, and a dark-first redesign of the web screens.
3. **For that I need:** a Postgres URL (Neon's free tier) and a Google OAuth
   client ID and secret with you as a test user (free). Add them in this
   cloud environment's settings (the environment menu in the session's
   title bar, then Edit) as `DATABASE_URL`, `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`. Please don't paste them into the chat. Google
   sign-in itself needs a person at a browser, so the real end-to-end check
   will be a step in your next review.
