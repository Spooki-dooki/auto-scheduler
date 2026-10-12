# CLAUDE.md. Standing instructions for this project

Read `PRODUCT_BRIEF.md` before doing anything. This file is *how you work*; the brief is *what you build*.

## 0. The situation you must understand

Justin owns this, but he is busy (college + a freelance business that pays the bills) and **cannot review your work line by line or test every screen.** He wants a finished, polished, Apple-grade product anyway. That only works if **you** carry the quality bar and prove it. Your job includes verifying your own work and reporting honestly.

Justin leans on AI tools to build and says he doesn't know code deeply. Write reports in plain language. Never assume he'll catch a mistake in a diff.

## 1. The honesty rule (most important)

**Never say something works unless you ran it and saw it work.**

- If a command could not run in this environment (no Node, no simulator, no network, missing credentials), say so explicitly, and list it under "Not verified" in your report. Do not imply success.
- "It should work" is not a status. Use: *verified*, *partially verified (what/what not)*, or *not verified*.
- The first Achieve It build was written without ever being compiled. Treat all existing code as **unproven** until Phase 0 of the brief passes.
- If you find a mistake in earlier work (yours or a previous session's), say so plainly, fix it, and note it in the report.

## 2. Autonomy: what you may decide alone vs. must ask

**Decide yourself, then record it in `docs/DECISIONS.md`** (what, why, alternatives):
- Library choices, file structure, naming, internal architecture, copy wording, visual details, algorithm approach, test strategy.
- Anything reversible and low-risk. Pick the best default and keep moving. Don't stall waiting for Justin.

**Stop and ask Justin first (put it in the report's "Needs your decision" section, and do not do it):**
- Spending money or creating paid accounts/subscriptions.
- Submitting anything to the App Store, TestFlight external testing, or Google verification.
- Deleting data, destructive migrations, or anything touching production data or real users' data.
- Changing the auth approach after users exist.
- Emailing, messaging, or notifying real people.
- Pushing to a remote or force-pushing; rewriting git history.
- Anything that contradicts `PRODUCT_BRIEF.md` principles (section 3 of the brief).
- Adding a new third-party service that receives user data.

**Never:** commit secrets or API keys; put API keys in the mobile app; log calendar event contents or tokens; disable TLS checks; skip tests to make a check pass.

## 3. Definition of done

A change is **not done** until all applicable items below are true and *evidenced in the report*.

### Every change
- [ ] Typecheck passes with zero errors.
- [ ] Linter passes.
- [ ] All existing tests pass; new behavior has tests (see section 4).
- [ ] No `TODO`, `FIXME`, `console.log`, commented-out code, or placeholder text left in shipped paths.
- [ ] No dead buttons: every tappable element does something real.
- [ ] Loading, empty, error, and offline states exist and were looked at.
- [ ] Docs updated if behavior or decisions changed (`docs/DECISIONS.md`, `docs/IDEAS.md`).

### Every screen / UI change
- [ ] Looked at, not just written: screenshots captured (see section 5), reviewed against the design rules in section 6.
- [ ] Works at small phone width (~375px) and a large one (~430px); no horizontal scroll, no clipped text.
- [ ] Touch targets ≥ 44pt. Text contrast meets WCAG AA. Dynamic Type / large text doesn't break layout. Screen-reader labels on interactive elements. Reduce Motion respected.
- [ ] Copy follows the voice rules and has been read for tone (calm, direct, never guilt).
- [ ] Friction budget checked (section 7).

### Every release / phase exit
- [ ] Every exit criterion for the phase in the brief is met and demonstrated.
- [ ] Full clean install from scratch works (`rm -rf node_modules` → install → typecheck → test → build).
- [ ] No known high-severity bug left unreported.
- [ ] `REVIEW.md` is current.

## 4. Testing requirements

- **Scheduling algorithm: required, thorough.** Unit + property tests: no overlapping events, fixed events never moved, deadlines respected when feasible, correct behavior when infeasible (flags it, doesn't silently fail), deterministic for identical input, timezone and DST correctness, midnight-crossing events, all-day events. This is the heart of the product.
- **Streak / habit logic:** never-miss-twice, window intervals (including midnight wrap and weekday-only windows), friction escalation tiers. The prior session ran ports of the window and streak logic ad hoc; make them real tests in the repo.
- **AI features:** validate model output against a schema (Zod). Test with fixtures, including malformed output, and the offline/no-key fallback path.
- **Calendar sync:** test against mocked provider responses (rate limits, token expiry, revoked access, deleted events, duplicate events).
- **Web UI:** end-to-end tests with Playwright covering the first-run flow and the main loop; save screenshots.
- **Mobile:** at minimum, run `npx expo-doctor`, typecheck, and a production bundle export to prove it builds. Component tests for the gate state machine.
- A flaky test is a bug. Fix it; don't retry-until-green.

## 5. Seeing your own work

Since Justin can't look at everything, you must.

- **Web:** run the app and use Playwright to capture screenshots of every screen at 390px and desktop widths, in both themes (Calm and Momentum), including empty/loading/error states. Actually inspect them and fix what looks off (spacing, alignment, contrast, truncation, jank). Save to `docs/screens/` with the date.
- **Mobile:** if a simulator or device is available, capture screenshots the same way. If not (no Xcode / no device), say so under "Not verified" and rely on the web-rendered React Native Web preview plus typecheck and bundle export, clearly labeled as a partial substitute.
- Before calling any UI done, do one deliberate pass asking: *would this feel at home next to Things 3 or Linear? What would a design-conscious person wince at?* Fix those things.
- **Design skill (required for all UI work):** this repo ships the Impeccable design skill in `.claude/skills/impeccable/`. Before building or reshaping any screen, invoke it (`/impeccable shape` to plan a new screen, then build; `/impeccable polish`, `layout`, `typeset` and the other commands for refinements) and follow its setup: run its `context` step, which loads `PRODUCT.md` and `DESIGN.md`, and read its `craft-floor.md` before any UI edit. Before calling a screen done, run `/impeccable critique` and `/impeccable audit` on it, fix what they find in one batch, and note the results in `REVIEW.md`. If its launcher can't run here, say so in the report and read `PRODUCT.md` and `DESIGN.md` directly.
- **Both themes, every time:** every screen is built and screenshotted in both the Calm and Momentum themes (see `DESIGN.md`).

## 6. Design and copy rules

`DESIGN.md` (repo root) is the visual authority: the two themes, tokens, components and the voice lines that change per theme. `PRODUCT.md` is the product truth the design skill reads. Brief section 8 is background. Non-negotiables:

- Dark first (light mode is an open decision), two switchable themes with one accent each, real type hierarchy, restraint and whitespace.
- None of: default purple-to-blue gradients, generic white rounded cards with soft shadows, stock emoji as icons, gratuitous glassmorphism, same hero-plus-big-button on every screen.
- Motion and haptics only where they mean something (completing a block, plan appearing, gate countdown).
- Centralize design tokens (color, type, spacing, radius, motion) in one place. No magic numbers in components.
- Centralize user-facing copy so tone can be tuned in one pass. No lorem ipsum, ever.
- **Voice:** calm, direct, a little quiet intensity. Short sentences. Never cutesy, never guilt, never shame. Example good: "Moved your bio review to 4pm. Everything still fits." Example bad: "Oops! You missed your task! 😢"

## 7. The friction budget

Setup friction is the product's biggest risk. For any flow you add or change:

- Count the taps and inputs before the user gets value. State the number in your report.
- First run: **≤ 3 inputs before the user sees their plan; first value < 60 seconds.**
- Every new setup step must justify itself in `docs/DECISIONS.md`. If it can be defaulted, inferred, deferred, or skipped, do that instead.
- Anything the app can figure out itself, it must not ask the user.
- If you add something that makes onboarding longer, you must remove something or defend it explicitly.

## 8. Security, privacy, and cost

- Secrets only in environment variables; `.env.example` documents them; `.env` is gitignored.
- AI calls are server-side only, with per-user rate limits and spend caps.
- Encrypt OAuth tokens at rest. Request the narrowest calendar scopes that work. Never log event titles/contents.
- Provide account deletion that really deletes (required by App Store when accounts exist).
- Keep a plain-language `docs/PRIVACY-NOTES.md` listing exactly what data is collected and why, so a privacy policy can be written from fact.
- Dependencies: prefer well-maintained, widely used packages; run `npm audit` and report high-severity findings.

## 9. Ideas: your standing mandate

Justin wants you to think of things he hasn't. Maintain `docs/IDEAS.md`. Each idea: what, which principle it serves, effort, risk. Apply the filter from the brief (reduces friction or a chore, improves first-run or daily feel, solves a real user problem, adds no setup burden). Propose freely; **build only ideas that pass the filter and fit the current phase**, and flag anything you built that wasn't in the brief.

## 10. Git and working hygiene

- Work in small, coherent commits with clear messages. Never commit secrets or build output.
- Don't push to remotes or rewrite history without asking (section 2).
- Don't leave the repo in a broken state at the end of a session. If you must stop mid-work, say exactly where.
- Keep `README.md` accurate: how to install, run, test, and what env vars are needed, written for a person who is not a developer.

## 11. End-of-session report: `REVIEW.md`

Overwrite `REVIEW.md` at the end of every session. Plain language, short, skimmable on a phone in two minutes. Use exactly this structure:

```
# Session report: <date>

## What changed (3-5 bullets, plain words)

## Verified (things I ran and saw work, with the command or screenshot)

## Not verified (things I could not run or check, and why)

## Bugs and risks found (including mistakes in earlier work)

## Friction check (taps/inputs to first value now; was it better or worse?)

## Needs your decision (max 3, each with my recommended default)

## 15-minute review for you (exact steps: what to open on your phone, what to tap,
## what to look for, and what "good" looks like)

## Next session will do
```

The "15-minute review" section matters most: Justin will use it once a week, open the app, screen-record a run-through, and send you the recording. Make the steps concrete enough that he can do it without thinking.

## 12. When you're unsure

- If the brief and this file conflict, this file's honesty and autonomy rules win; the brief's product principles win over any feature detail.
- If something is ambiguous and reversible, choose, document, continue.
- If something is ambiguous and expensive or irreversible, stop and ask in the report instead of guessing.
