# Achieve It — Product Brief (merged: planner + focus protection)

Working name: **Achieve It**. Name is not final; do not hard-code it in places that are expensive to change (use a single constant / config).

Owner: Justin (solo founder, CS student, freelance dev). He is busy and cannot review every change. Read `CLAUDE.md` first. It defines how you work, what you may decide alone, and what "done" means.

---

## 1. What this is, in one paragraph

An app that **plans your day for you, protects the time it plans, and reminds you why it matters**. It takes what you have to do (classes, exams, work shifts, projects, gym, sleep), puts it on your calendar automatically, moves things when life slips, and when you reach for a distracting app during a focus block it shows you who you said you wanted to be, not a wall. It is for busy people and easily distracted people, and for anyone who simply wants a more focused, balanced life.

It merges two products Justin was building separately:

- **The planner** (auto-scheduler, Motion-style): tasks, deadlines and priorities in, scheduled calendar out. Web stack: Next.js, Auth.js, Prisma, Postgres (Neon). Google Calendar first, then Outlook, then Apple/iCloud. Lives in `~/Documents/auto-scheduler`.
- **The focus layer** (Achieve It): app windows, friction gate, identity statement, goal roadmap, Atomic Habits mechanics, tracker. Expo / React Native, Claude API for roadmap generation. Lives in `~/Documents/achieve-it`. The full original spec is in `docs/achieve-it-spec.md`; read it alongside this brief. Where the two differ, this brief wins.

How they fit: **the planner decides what you should be doing right now; the focus layer defends that block and supplies the reason.** The planner is the shared brain/backend. The Expo app is the phone client.

## 2. Who it's for

1. **College students.** Syllabi, exams, labs, jobs, and no structure. Highest-priority audience.
2. **Busy people** (working, freelancing, parents) who don't have time to manage a productivity system.
3. **Easily distracted people**, including people with ADHD, but do not market it as a medical product (see section 11).
4. **Anyone who wants a more balanced, focused life.** Balance means rest and health get scheduled too, not just work.

## 3. The principles. These beat any feature.

These come directly from Justin. If a feature violates one, cut or redesign the feature.

1. **It works for you, not against you. Zero chore.** If a user has to micromanage the app, we failed. The app does the planning; the user confirms or ignores. Default to automatic, with an easy override.
2. **First value in under 60 seconds.** A new user sees a real, personalized plan for their week before they finish setup. Setup is not a gate in front of the product. It is part of the product.
3. **Short attention span is the design constraint, not an edge case.** One primary action per screen. Plain words. No screen that needs reading to understand.
4. **Every setup step must earn its place.** Ask the minimum. Everything skippable. Everything askable later. Smart defaults everywhere. Permissions requested in context, with a reason, at the moment they're useful.
5. **Never shame, never punish.** "Never miss twice" applies to the schedule too. Missed a task? It quietly moves. No red overdue piles, no guilt copy, no streak-loss drama after a single slip.
6. **Explain in place.** Anything non-obvious has a tiny, optional "why / how" right where the confusion would happen. Don't send people to a help page.
7. **Fewer, better notifications.** Each notification must be something the user would thank us for. Quiet hours by default. Easy global dial-down.
8. **It should feel great.** A first impression that makes someone want to keep it. Real polish, haptics, motion that means something. See section 8.
9. **Honest about what it can and can't do.** Don't claim blocking we can't enforce (see section 10).

## 4. First-run experience (spec)

Target: **under 60 seconds to "here's your week", at most 3 taps/inputs before value.**

1. **Hook screen.** One line of promise, one visual, one primary button. Primary: *Connect my calendar*. Secondary: *Try it without connecting* (loads a sample week so the product can still demonstrate itself).
2. **Instant plan.** On calendar connect, import events and immediately show the user their week with open time visible. No questions yet. This is the "oh, that's cool" moment. Animate it in; it should feel like the app *did something*.
3. **One question.** "What's one thing you're trying to get done (or become) right now?" Free text, optional, with 3-4 tappable examples. Live-preview the identity line it creates (the existing mechanic from the original spec). Skippable.
4. **Dump-in.** "Anything else on your plate?" Single text box that accepts messy, pasted, or spoken input ("bio exam friday, finish proposal for Craig, gym 3x"). AI parses into tasks with durations and deadlines; user taps to confirm all. Skippable.
5. **Done.** Land on Today. One next action, big.

Deliberately **not** in first run: app-blocking setup, notification tuning, passcode, accountability partner, detailed preferences, tutorials.

**Progressive disclosure over the first week** (each one is an offer, dismissible, never repeated more than twice):

- Day 0-1: "Want me to protect your first focus block?" → introduces app windows and the friction gate in context, for one app.
- Day 2-3: Refine identity statement. Offer calendar categories (school / work / health / rest).
- Day 7: Weekly balance snapshot and "what should I do differently next week?"

Measure all of this (section 9).

## 5. Planner: behavior spec

- **Inputs:** tasks (title, estimated duration, deadline, priority), fixed events from calendars, user preferences (work hours, sleep, when they focus best, buffers).
- **Output:** tasks placed as events on the user's calendar, respecting fixed events, deadlines, and protected time.
- **Auto-reschedule:** when a task slips, an event runs long, or a new fixed event appears, re-plan automatically and tell the user in one line what moved. No manual rescue required.
- **"I'm behind" button:** one tap, re-plans the day/week realistically, drops or defers lowest-priority items, says what it did.
- **Protected balance:** sleep, meals, exercise, rest, and social time can be scheduled as protected categories the planner won't fill with work. If a week is overbooked, say so plainly and propose what to cut, rather than silently cramming.
- **Learns durations:** compare estimated vs. actual time and quietly improve estimates (students and busy people chronically underestimate).
- **Calendar providers:** Google first, fully working end to end before starting Outlook, then Apple/iCloud. Provider logic behind one interface.
- **Out of scope** (even for the broader audience): team features, booking pages, Kanban/Gantt project views.

**Testing requirement:** the scheduling algorithm needs unit and property tests (no overlaps, fixed events never moved, deadlines respected when feasible, deterministic for same input, sensible when infeasible). This is the core of the product and the thing Justin can't eyeball.

## 6. Focus layer: behavior spec (carried over from the original Achieve It spec)

Keep all of this; it's the differentiator. Highlights (full detail lives in `docs/achieve-it-spec.md`):

- Per-app allowed windows; notifications when windows open/close; calendar-aware blocking (during a scheduled focus/class/work block, distracting apps are in "protected" mode).
- **Friction gate**: confront (identity line + cost stat + current streak) → unskippable countdown → passcode or re-entry → grant. Escalates with breaks per day. Never defaults to easy.
- **Identity-based habits**: the gate references who you said you are, not just the goal.
- **Atomic Habits four laws** in both directions, **Two-Minute Rule** on every roadmap step (enforced in the AI output schema), **never miss twice** streaks, **visible 30-day tracker** with auto-marking (no manual logging), animation + haptic on a held day.
- **Tiered blocking:** Level 1 time windows + interruption; Level 2 real enforcement via Apple Screen Time / Family Controls (needs Apple approval + native Swift); Level 3 feature-level blocking (native modules; Android first).
- The roadmap AI is one call, 5-7 steps. Add a lightweight weekly check-in later so roadmaps don't go stale.

**Connect the two layers** so it feels like one product, not two apps stapled together:

- Today's one action = the planner's current block.
- Starting a block can auto-enter protected mode for that block's distractions.
- Finishing a block marks the tracker automatically.
- The gate screen can mention what's scheduled next ("Your bio exam prep starts in 20 minutes.").

## 7. Ideas to evaluate. Your mandate is to think beyond this list.

Justin wants you to come up with things he hasn't thought of. Process: put proposals in `docs/IDEAS.md` with (a) what, (b) which principle it serves, (c) effort, (d) risk. Build only ideas that pass the filter below. Don't silently add features.

**Filter:** Does it (1) reduce friction or remove a chore, (2) make the first-run or daily experience noticeably better, or (3) clearly serve a core user's real problem? And does it avoid adding setup or maintenance for the user? If not, it's a no.

Seeds worth serious consideration:

- **Syllabus import** (strongest student hook): upload a PDF or photo of a syllabus; AI extracts exams, assignments, due dates, and schedules study time backwards from them. One action, a whole semester planned.
- **Brain-dump capture**: type or speak anything messy, get scheduled tasks. Share-sheet / widget capture later.
- **Calm "shutdown" at end of day**: 30-second review, tomorrow already planned.
- **Smart start ritual**: a tiny 2-minute pre-block step to get going (ties to Two-Minute Rule).
- **Focus soundscapes / body-doubling timer** (cheap and genuinely useful for people who struggle to start).
- **Canvas / LMS import** for students (later).
- **Apple Shortcuts / Focus Mode integration**, **Live Activity** for the current block, **home/lock-screen widget** (native work, post-MVP).
- **Shareable weekly recap card** (lightweight social proof / organic marketing loop).
- **Study-with-friends sessions** (later; accountability without a full social network).
- **Commitment device** (optional stake if a streak breaks).
- **Referral loop** for students (campus-level word of mouth is the likely growth channel).

## 8. Design direction. "Apple-grade" is the bar

**`DESIGN.md` at the repo root is now the visual authority** (two switchable themes, Calm and Momentum). This section is the original background.

- **Reference quality:** Things 3, Linear, Opal, Apple's own apps, Arc. Study how they feel, not just how they look.
- **Dark first**, light mode supported. One strong accent color, used deliberately. Real typographic hierarchy (pick a distinctive heading face with a native-feeling body; justify the choice in `docs/design-notes.md`).
- **Native feel:** follow iOS Human Interface Guidelines. Correct safe areas, back-swipe, 44pt touch targets, Dynamic Type, VoiceOver labels, Reduce Motion respected.
- **Motion and haptics that mean something:** marking a block done, the plan appearing, the gate countdown. Not decoration elsewhere.
- **Never ship:** default purple-to-blue gradients, generic rounded white cards with soft shadows, stock-emoji icons, glassmorphism for its own sake, centered-hero-plus-big-button on every screen, lorem ipsum or placeholder copy anywhere.
- **Every screen has real loading, empty, and error states.** Empty states are an opportunity (they should tell the user the single thing to do next), not a blank page.
- **Voice:** calm, direct, quietly intense. Never cutesy, never guilt-tripping. Short sentences. Write all copy deliberately; keep it in one place so it can be tuned.
- **Every button does something real.** No dead taps, no "coming soon" in core flows.

## 9. Comprehension and feedback loop

Justin's concern: lots of moving parts, and people will bail if setup or understanding is hard. Build the product to be *observed* from day one.

**In-app:**
- One-tap feedback on every screen ("This confused me" / "This was great" / free note). Goes to a table we can read.
- Contextual "why am I seeing this?" on anything non-obvious.

**Analytics (privacy-respecting, minimal; document exactly what's collected):**
- Funnel: install → open → connect calendar → plan shown → first task added → first block completed.
- **Time to first value** (target < 60 s), **drop-off per setup step**, D1 / D7 / D30 retention, % users who complete a scheduled block in week 1, gate hold rate, notification opt-out rate.

**Testing protocol (docs/TESTING.md):**
- Recruit 5 students at a time via TestFlight. Watch them use it *without helping*; note where they hesitate, misread, or stop. Five users find most usability problems.
- Fixed task script: set up, add a task, understand what the app did, reschedule, protect a block.
- Every finding is logged in `docs/FEEDBACK.md` with severity and a fix status.

## 10. Platform and policy realities (plan around these now)

- **Apple Screen Time / Family Controls entitlement:** needs an application and approval, can take weeks. **Apply early, in parallel with development.** Until approved, the app can interrupt and nudge but cannot enforce. Do not describe Level 1 as unbreakable blocking anywhere in the product or store listing.
- **App Store review:** privacy policy, accurate privacy labels, purpose strings for calendar/notifications, working demo/test account, in-app **account deletion** (required if accounts exist), and **Sign in with Apple** (or equivalent) where required alongside other social logins. Verify current guidelines before submission.
- **Google Calendar OAuth:** calendar scopes are sensitive; production use beyond test users requires Google's app verification. Start that process before beta, not at launch.
- **Data sensitivity:** calendars reveal a person's life. Collect the minimum, encrypt tokens at rest, never log event contents, never use calendar data to train anything, and say so in plain words in the privacy policy.
- **AI cost control:** per-user rate limits and caps on every Claude API feature (roadmap, parsing, syllabus). A free user must not be able to run up the bill.

## 11. Marketing and claims guardrails

- Positioning: **focus, balance, and a plan that runs itself.** Built for busy and easily distracted minds.
- **Do not claim to treat, diagnose, or help with any medical condition** (including ADHD). Describe features and behavior ("two-minute starts, no shame streaks") rather than outcomes for a condition. This also keeps App Store review simple.
- Justin's personal story (building the tool he needed) is a legitimate founder narrative. Leave that to him to tell.
- Marketing ideas and growth research are handled separately by Justin; don't build growth hacks into the product without proposing them via `docs/IDEAS.md`.

## 12. Architecture decisions to resolve (decide, document, flag, don't stall)

Record each in `docs/DECISIONS.md` with the options considered and why you chose.

1. **Shared backend:** the existing Next.js/Prisma/Postgres app becomes the API for both web and Expo.
2. **Mobile auth:** Auth.js is web-session oriented. Pick a token-based approach for the Expo client (e.g. short-lived access tokens + refresh) that works with the same user table. Include Sign in with Apple.
3. **Monorepo vs. two repos:** recommend whichever lets the apps share types (schedule, task, window) without copy-paste. Don't over-engineer; a shared types package is enough.
4. **Where the AI calls live:** server-side only. Keys never on device.
5. **Offline behavior:** Today screen must load from cache and not dead-end when offline.
6. **Roadmap/identity data model** should hang off the same user and the same task table so the planner can schedule roadmap steps.

## 13. Phases and exit criteria

| Phase | Goal | Exit criteria |
|---|---|---|
| 0 | Verify what exists | Both repos install, typecheck, and run. Written audit of what works vs. what was never run. |
| 0.5 | Design system + theme switch | Tokens for both themes from `DESIGN.md` in code (one source per app), Settings → Appearance switch working, every existing screen restyled in both themes, Impeccable critique/audit run and fixed, screenshots of every screen in both themes. |
| 1 | Planner core (web) | Google Calendar connect, task in → scheduled event out, auto-reschedule, tested algorithm, screenshots of every screen. |
| 2 | First-run + Expo client | 60-second first-run flow works end to end, Today screen on phone reads the real schedule, offline-safe. |
| 3 | Focus layer on top | Windows, friction gate, tracker, identity, wired to scheduled blocks. Honest Level 1 messaging. |
| 4 | Private beta | TestFlight, 10-20 students, feedback + analytics live, privacy policy and OAuth verification in progress. |
| 5 | Enforcement and growth | Family Controls entitlement wired (if approved), widgets, syllabus import, referral loop. |

Don't start a phase until the previous one's exit criteria are met and reported in `REVIEW.md`.

## 14. What to hand back after each work session

Follow the report format in `CLAUDE.md`. Short, plain language, honest about what wasn't verified.
