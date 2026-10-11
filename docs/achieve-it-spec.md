# Achieve It — App Spec

## Context

My name is Justin. I'm a freelance web developer and AI automation business owner serving local clients in Port St. Lucie, Florida. I'm also a CS student at Indian River State College completing my AA, and I plan to transfer to University of Florida for CS with an EE minor. Long term I want to build companies in AI and robotics, not take a corporate job. I started freelancing in high school with real paying clients.

## The App — "Achieve It"

A screen time and focus app for iOS (and eventually Android) that combines app blocking with a personal goals/roadmap system. Think Opal or BePresent but with a "why" layer — instead of just blocking apps, it ties your phone usage to what you're actually trying to build in your life.

**Why it's different:** Opal/BePresent just block. Achieve It connects screen time to your actual goals, so when you try to open a blocked app you're reminded of what you're supposed to be working toward — not just hit with a wall.

## Core Feature Spec

### 1. App Blocking & Scheduling
- Users set allowed time windows for specific apps (e.g. Instagram only 7:00–7:30pm)
- Push notifications when a window opens or closes
- Calendar integration — auto-block apps during calendar events like "Work" or "Gym"

### 2. Friction Gate
- To access a blocked app outside its window, the user must enter a passcode OR watch a motivational video
- Creates intentional friction rather than a hard block — forces a conscious decision instead of a mindless open
- Video length can scale up the more a window has been broken that day

### 3. Goals & Roadmap Section
- User sets a main objective (e.g. "Launch my app," "Get fit," "Study for finals")
- AI generates a roadmap and action steps toward that goal
- Roadmap steps are broken down to a "starter version" under 2 minutes (Atomic Habits' Two-Minute Rule) so starting is never the barrier
- When a blocked app is opened, the user sees their goal/roadmap as a reminder of what to do instead

### 4. Notifications & Reminders
- "Be present" nudges when reaching for the phone
- Reminders of current goal
- Alerts when usage windows open or close

## Atomic Habits Integration (James Clear's Four Laws)

This is the differentiation layer — using the book's framework for both breaking the bad habit (doomscrolling) and building the good one (goal work).

**Breaking the bad habit (inverted laws):**
- *Make it invisible* — grayscale blocked app icons, strip notification badges outside the allowed window
- *Make it unattractive* — before the friction gate, show a cost stat: "You've spent 4.5 hrs on this app this week — 4.5 hrs not spent on [goal]"
- *Make it difficult* — the friction gate itself (passcode/video), scalable by how often the window's been broken
- *Make it unsatisfying* — optional accountability partner who sees broken streaks; public cost beats private cost

**Building the good habit (forward laws):**
- *Make it obvious* — lock screen widget showing today's one roadmap action, not the whole roadmap
- *Make it attractive* — social proof feed of others working toward similar goals; small reward bundled with finishing a work session
- *Make it easy* — Two-Minute Rule applied to every roadmap step; one-tap "start session" auto-blocks distracting apps
- *Make it satisfying* — immediate visual payoff (checkmark, progress tick) the second a step is logged done

**Two more concepts to build in:**
- *Identity-based habits* — let users set an identity statement ("I'm someone who builds things") instead of just a goal. The friction gate references the identity, not the goal: "A person who builds things doesn't open Instagram right now." This is the sharpest version of the "why layer" pitch.
- *Never miss twice* — streak logic should never punish a single missed day, only intervene after two in a row. Keeps the app from feeling punitive and causing people to quit after one slip. Meaningful UX edge over Opal/BePresent.

## Visible Habit Tracker (Atomic Habits' tracking chapter)

Clear's chapter on habit tracking argues tracking works for three specific reasons — this layer implements each one directly, on top of the streak logic already built (`computeStreak()`):

- **The chain has to be visible, not just counted.** Replace/supplement the streak number on Home with a 30-day calendar grid (GitHub-contribution-graph or Seinfeld's-"X"-calendar style) — one cell per day, filled if the day was held. Seeing an unbroken line creates a different pull than reading a number does.
- **Recording progress has to feel good in the moment.** The instant a day gets marked "held," give it real weight — a fill animation on that day's cell, a haptic tap — not a silent database write. The book's claim is that the act of marking is itself a small reward that reinforces the behavior.
- **Auto-mark, don't ask the user to log manually.** Clear generally recommends manual tracking because the act of writing it down builds awareness. But the app already knows whether a window was held or broken, so manual logging here would be pure friction with no benefit — auto-marking is the right adaptation, not a shortcut.
- **Surface the streak at the moment of temptation, not just after.** Add the current streak count into the gate screen's confront phase, alongside the identity line and cost stat: "You have a 12-day streak — this breaks it." Loss aversion (not wanting to lose what you've built) is a stronger pull than the abstract cost stat alone.
- **Track the real behavior, not a vanity metric.** What gets tracked should be "window held" / "step completed" — not something like "app opens avoided," which measures the wrong side of the behavior and invites optimizing the number instead of the habit.

## Tiered Blocking System (SocialLite-inspired)

Instead of one blunt on/off block, blocking has levels of intensity:

- **Level 1 — Time windows.** App usable only in scheduled windows. Buildable on both platforms with the standard MVP approach.
- **Level 2 — Full block + friction gate.** Passcode or video required outside windows. Buildable on both platforms; iOS requires the Screen Time/Family Controls entitlement (Apple approval required, native Swift).
- **Level 3 — Feature-level blocking** (e.g. block Instagram Reels/Stories but leave DMs and posts usable). This is where the platforms diverge sharply:
  - **Android:** possible via `AccessibilityService`, which can inspect on-screen UI elements and detect specific in-app screens (e.g. "user is on the Reels tab") and intercept them. This is how apps like AppBlock do it. Requires a custom native module (not pure Expo managed workflow) and ongoing maintenance since Instagram/YouTube UI updates can break the detection.
  - **iOS:** not possible inside the native Instagram app — Apple's sandboxing gives no API for a third-party app to inspect another app's in-app UI. The workaround apps like SocialLite use is blocking the native app entirely via Screen Time, then offering their own in-app browser loading the mobile web version, where Reels/Shorts elements can be stripped via injected CSS/JS since it's just a webpage.

Level 3 is real, and worth keeping in the product vision, but it's phase-2 native-module work on both platforms — same bucket as the Screen Time entitlement itself, not part of the MVP.

## Tech Decisions

- React Native with Expo for the MVP — fastest path given existing JavaScript/web dev background
- iOS hard app blocking requires Apple's Screen Time/Family Controls entitlement (native Swift, Apple approval required) — treated as a post-MVP concern, not a blocker for the initial build
- Calendar integration via device calendar permissions (EventKit on iOS)
- AI-generated roadmap using the Claude API — keep the first version simple: one call that breaks a goal into 5–7 steps, not an adaptive/smart system
- Level 3 feature-blocking (above) requires native modules on both platforms and is out of scope for MVP

## Design Direction

- Clean, minimal, motivational
- Dark mode preferred
- Premium feel like Opal or BePresent, not cheap or generic

## MVP Build Order

1. Onboarding flow — user sets their main goal/identity statement, roadmap is generated
2. Home screen — shows goal, today's schedule, which apps are currently blocked vs open
3. Friction gate screen — passcode or video option, references identity statement
4. Settings screen — manage app schedules and time windows (Level 1)
5. Calendar integration
6. Notifications

**Post-MVP:** Level 2 full blocking (Screen Time entitlement), Level 3 feature-level blocking (native modules, Android first since it's more tractable), social proof feed, accountability partner.

## Skill Level & Approach

- Knows JavaScript and web dev well, no Swift experience
- Using Claude Code with AI assistance to build this
- Goal: get as far as possible in React Native/Expo before hitting native walls, then evaluate learning Swift/Kotlin or hiring a native developer

## Long-Term Vision

If the app works well personally, release it on the App Store, potentially advertise it, and turn it into a product. The differentiated angle — the goals/identity/roadmap layer combined with tiered, Atomic-Habits-based blocking — is what competitors don't have.