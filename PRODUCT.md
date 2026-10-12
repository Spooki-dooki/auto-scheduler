# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: college students juggling classes, exams, labs and part-time jobs with no structure. Also busy working people and freelancers who have no time to run a productivity system, and easily distracted people (including people with ADHD) who struggle to start and to stay on task. Secondary: anyone who wants a more focused, balanced life. They open the app in short bursts, often mid-task or mid-temptation, on a phone.

## Product Purpose
Plans the user's day automatically from their tasks, deadlines and calendar, protects the time it plans by putting friction between them and distracting apps, and reminds them who they said they want to be. Success: a new user sees their own week planned in under 60 seconds, and keeps completing scheduled blocks in week one and beyond.

## Positioning
Screen-time apps (Opal, BePresent) only block; planners (Motion) only schedule. Achieve It joins the two: the planner decides what you should be doing now, the focus layer defends that block, and the friction gate shows your own identity statement and the real cost instead of a wall. Built on Atomic Habits mechanics (identity, two-minute starts, never miss twice).

## Operating Context
Used on iPhone first (Android later) alongside the user's existing calendar (Google first, then Outlook and iCloud). A companion web planner shares the same account and backend. Moments of use: morning glance at Today, the gate interrupting a reflexive app open, marking a block done, the "I'm behind" re-plan.

## Capabilities and Constraints
- Expo / React Native app; Next.js + Postgres backend shared with the web planner. AI (Claude API) only server-side, with per-user rate limits and spend caps.
- Real app blocking on iOS requires Apple's Family Controls entitlement (requested, not yet granted). Until then the app can only nudge and interrupt; never present this as unbreakable blocking.
- Two switchable visual themes (Calm default, Momentum) are a product feature, set in Settings → Appearance.
- Out of scope: team features, booking pages, Kanban/Gantt views.
- Full spec: PRODUCT_BRIEF.md and docs/achieve-it-spec.md.

## Brand Commitments
Working name "Achieve It" (not final; keep it in one constant). Voice: calm, direct, a little quiet intensity; short sentences; never cutesy, never guilt or shame. No medical claims (do not claim to treat or help ADHD).

## Evidence on Hand
No users, testimonials, metrics or press yet. Do not invent any. Sample data in designs must look like a real student's day, not lorem ipsum.

## Product Principles
1. It works for you, not against you: zero chore, automatic by default, easy override.
2. First value in under 60 seconds; at most three inputs before the user sees their plan.
3. Short attention span is the design constraint: one primary action per screen, plain words.
4. Never shame, never punish: a missed task quietly moves; a single slip never breaks the chain.
5. Honest about what it can and cannot do.

## Accessibility & Inclusion
WCAG AA contrast, 44pt minimum touch targets, Dynamic Type without clipping, VoiceOver labels, Reduce Motion respected. Designed for users with attention difficulties: minimal reading, no time pressure except the deliberate gate countdown.
