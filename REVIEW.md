# Session report: 2026-10-12

Phase 0.5 (design system and theme switch), plus the planner fixes you
asked for after my review. This report is identical in both repos. Branch:
`phase-0.5` in each (built on `design-setup`). Nothing is on `main`.

## What changed (3-5 bullets, plain words)

- **Two looks in both apps: Calm (the default) and Momentum.**
  - Every color, font and size from `DESIGN.md` lives in one file per app,
    and the two files match. The old orange "ember" look is gone.
  - **Settings, Appearance** switches the whole app at once, with three
    accent colors per look.
  - The phone remembers your choice on the phone; the planner saves it to
    your account.
- **The planner schedules without a calendar.** A new task goes straight
  into your usual hours. One quiet line says "Connect your calendar so I
  can avoid your classes and events." The banner and greyed-out button
  that said otherwise are gone.
- **Planner screens, as you directed:**
  - On phones the plan comes first: now/next, the week, then one "Add
    something…" field that opens on tap, then tasks.
  - Momentum leads with big numbers: minutes left, and hours planned.
  - The add form uses plain words ("Work in chunks of", "Schedule
    during"). The length chips have an edge, a check mark when chosen, and
    44px targets.
  - Hours is one line per day, such as "Mon · 9:00 AM – 5:00 PM".
- **A design review and an audit on every screen of both apps, with fixes.**
  - Phone: "Closed", not "Blocked", since the app can't block yet. The
    gate's biggest button names your task, and there's no red for a slip.
  - Planner: keyboard focus never hides, nothing scrolls sideways at small
    widths or large text, and it works with a keyboard and screen reader
    in Chromium.
- **Bugs found and fixed:**
  - The planner's deadline words were wrong ("in 2 days" for tomorrow).
  - Settings broke in other time zones.
  - The week hid study blocks that ran past midnight.
  - The planner logged whole error objects, which can carry tokens.
  - Three privacy lines on the phone were untrue.

## Verified (things I ran and saw work, with the command or screenshot)

**Planner** (`auto-scheduler`):

- `npm run typecheck`, `npm run lint` and `npm run build` succeed, and
  `npm test` passes **92 tests** (60 at the start of this round).
- New tests cover:
  - scheduling with no calendar (your own hours, 9:00 AM first, overflow
    still flagged, a started block never moved, same result every run)
  - deadline words across midnight and the November clock change
  - selection and progress-bar contrast in both looks
  - a guard that fails if any screen says scheduling needs a calendar
  - a guard that fails if an error object reaches the log
- **`scripts/check-no-calendar.mjs`: 19 of 19**, on the production build
  with a local database, at phone width with no calendar:
  - The quiet calendar line shows, with no Re-plan button while there's
    nothing to plan.
  - Adding a task showed "First session: Mon 12 Oct, 9:00 AM." The task
    appears in the week and the list.
  - Re-plan then said "Nothing needed to move. Everything still fits."
  - The database holds 2 hours of blocks that were sent nowhere.
- **`scripts/check-access.mjs`: 71 of 71**, both looks:
  - no sideways scroll at 320px or at 200% text, with forms open or closed
  - nothing focused hides under the tab bar or the Hours save bar
  - the skip link comes first, and each page has its own title
  - arrow keys work in the theme picker
  - Settings has no errors in another time zone
- **`scripts/check-appearance.mjs`: 10 of 10.** The switch takes 170ms
  with no reload, is saved, survives a reload, and follows your account to
  another device.
- **60 screenshots** (10 states × 2 looks × 375, 430 and 1280 wide), none
  scrolling sideways:
  `auto-scheduler/docs/screens/2026-10-12-phase05-themes/`.
- **Scores:**

  | Planner | Before | After round 1 | Final |
  |---|---|---|---|
  | Design review | 24/40 | 24/40 | **28/40** |
  | Audit | 14/20 | 14/20 | not re-scored |
  | Automated scan | 8 notes, none real | 1 false alarm | 0 warnings, same 8 notes |

  How to read this:
  - **Round 1 stayed at 24 and 14** because each re-run looked deeper and
    found new problems (the deadline bug, Hours edits lost, large text in
    open forms). I fixed those and ran again.
  - **The final design review** treated features not built yet (editing a
    task, your classes in the week, account deletion) as "later", so that
    column isn't strictly comparable.
  - **The final audit stopped partway** when my usage limit ran out.
    Before it stopped, it found two problems (focus hidden under the Hours
    save bar, an unpadded skip link). Both are fixed and checked by
    `check-access.mjs`.
  - **After the final review** I fixed five smaller things it raised
    without scoring again: wrong "didn't fit" advice for past due dates,
    "Invalid input" errors, Momentum's card order, separators that started
    lines, and focus lost when ticking a task.

**Phone app** (`achieve-it`):

- Typecheck and lint are clean, and **140 tests pass** (re-run today).
- `npx expo export` builds for iPhone, Android and web (re-run today).
- **80 screenshots** of every screen, both looks, at 375 and 430, in a
  browser: `achieve-it/docs/screens/2026-10-12-phase05-themes/`.
- **`scripts/check-appearance.mjs`: 9 of 9.** The switch takes 121ms and
  is remembered.
- Its design review (26/40) and audit (13/20) were run, and every finding
  was fixed.

## Not verified (things I could not run or check, and why)

- **The phone app on a real phone.** There's no device or simulator here.
  Unchecked: fonts and SF Symbols on iOS, haptics, notifications, calendar
  reading, Reduce Motion and Larger Text, and opening other apps.
- **Anything needing Google** (no credentials):
  - signing in, reading busy times, writing blocks
  - blocks planned without a calendar moving onto it once you connect. That
    code path exists and is unchanged, but has never run against Google.
- **Screen readers, Safari and Firefox.** I checked labels and focus in
  code and in Chromium only.
- **Partly verified:** at 200% text the browser's own deadline field cuts
  off its text. The line under it spells the deadline out in full.
- **No re-score after the fixes** for the phone app or the final planner
  audit (see above).
- **2 of 21 `expo-doctor` checks** need Expo's servers, which this sandbox
  blocks.

## Bugs and risks found (including mistakes in earlier work)

Still open, most important first:

1. **Without a calendar, a plan can land on a class.** The app can't see
   your classes; the quiet line asks you to connect. Also, as before, a
   session whose time has passed counts as done.
2. **Planner: "Reconnect" can't repair broken Google access** (from Phase
   0). Settings now at least says when it can't load your calendars.
3. **Phone (from Phase 0):** "Open Instagram" after the gate probably
   fails on iPhone, and the AI roadmap route has no sign-in or spending
   limit.
4. **Small planner gaps:**
   - You can't edit a task yet.
   - Deletes use the browser's plain confirm box.
   - On a new device, a saved theme appears a moment after the page loads,
     once.
5. **`npm audit`, re-run today and unchanged:**
   - phone: 29 findings, 0 critical, 18 high, all in build tools
   - planner: 14 findings, 0 critical, 9 high

My own mistakes, all fixed:

- My first planner redesign contradicted itself on a new account.
- Its Momentum was just Calm in capitals.
- It made selected text invisible in Momentum.
- It clipped form values at large text.
- A few of today's planner commits don't type-check on their own (they use
  something added a commit or two later). The tip of the branch is green.

## Friction check (taps/inputs to first value now; was it better or worse?)

- **Planner: better.** It's the same number of actions as before: sign in
  (3 to 4 taps), tap "Add something…", type, tap "Add and schedule". But
  you now get a planned session even with no calendar; before, nothing
  happened. Defaults (due tomorrow 5 PM, 1 hour) mean nothing else is
  required.
- **Phone: the same as Phase 0.** At least 2 answers plus 6 taps before
  Today, against a budget of 3 inputs. Phase 2 rebuilds the first run.

## Needs your decision (max 3, each with my recommended default)

1. **Merge `phase-0.5` into `main` in both repos?** Recommended: **yes**,
   after the review below. That closes Phase 0.5 and lets Phase 1 start.
2. **Combine both repos into one before Phase 1?** This is still open from
   Phase 0. Recommended: **yes**. The two token files are already
   identical copies, and one repo keeps them that way (X-3 in
   `docs/DECISIONS.md`).
3. **Background re-planning on Vercel.** Phase 1 needs it, and the free
   plan may only run timers daily. Recommended: **don't pay**. Use
   Google's "calendar changed" notifications plus one daily run.

## 15-minute review for you (exact steps: what to open on your phone, what to tap,
## what to look for, and what "good" looks like)

**Phone app (10 min).** On your Mac, in Terminal:

```bash
cd ~/Documents/achieve-it && git fetch && git checkout phase-0.5 && npm ci && npx expo start
```

Open **Expo Go** on your iPhone, point the Camera at the QR code, and tap
the banner. If you see the first-run screens, tap the examples to get
through them.

1. Tap **Settings**, then **Appearance**. Good: two small previews, with
   Calm marked "Selected".
2. Tap **Momentum**. Good: the whole app turns black, white and blue at
   once, with no restart. Tap **Crimson**: blue becomes red.
3. Go to **Today**. Good: the date is the big heading, the tab names are
   fully visible, and nothing is cut off.
4. Tap an app marked **Closed** (TikTok, for example), then **Open
   anyway**. Good: the biggest button says "Back to" plus your step,
   nothing is red, and the wait counts down.
5. Swipe Expo Go away, reopen it and the project. Good: still Momentum,
   still Crimson.
6. Settings, **Appearance**, **Calm**. Good: warm and rounded again, with
   Calm's own accent.
7. Optional: iPhone Settings, Accessibility, Display & Text Size, **Larger
   Text** to the maximum. Good: Today and the gate still fit.

**Planner (5 min, screenshots).** It can't run for you until Google is set
up. On GitHub, open `auto-scheduler`, branch `phase-0.5`, folder
`docs/screens/2026-10-12-phase05-themes/`:

1. `calm-w375-04-schedule-new-account.png`. Good: no banner, one quiet
   underlined calendar line, and one obvious thing to do: "Add something…".
2. `calm-w375-04b-schedule-no-calendar-planned.png`. Good: a task added
   without a calendar is already planned ("Up next", 9:00 AM).
3. `calm-w375-03-schedule.png` next to `momentum-w375-03-schedule.png`.
   Good: the same plan, but Momentum leads with huge "MIN LEFT" and "HOURS
   PLANNED" numbers. The week comes before the add field.
4. `calm-w375-03b-schedule-adding.png`. Good: plain words, and a check
   mark on the chosen length.
5. `momentum-w375-05c-hours-unsaved.png`. Good: one line per day, with a
   "Save and re-plan" bar after an edit.

Then send me a screen recording of the phone part, plus anything that felt
slow, confusing or ugly.

## Next session will do

Only after you say go:

1. Combine the repos (if you say yes).
2. **Phase 1, the planner core:**
   - Google connect end to end, including fixing "Reconnect".
   - Ownership and time-zone checks.
   - Scheduler property tests, and tests against recorded Google
     responses.
   - This session's Playwright checks, run on every push.
   - Database migrations.
   - Editing a task, and undo instead of the confirm box.
   - The review's next fixes: loading and error pages, a folded add form
     on desktop, copying hours to several days, and one hero number in
     Momentum.
3. **I need** a Postgres URL (Neon's free tier) and a Google OAuth client
   ID and secret, with you as a test user. Add them in this cloud
   environment's settings as `DATABASE_URL`, `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`, not in the chat.
