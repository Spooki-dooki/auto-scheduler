# Ideas

Proposals only. Nothing here is built unless it says so. Each idea lists
what it is, which principle from the brief (section 3) it serves, effort
(S = under a day, M = a few days, L = a week or more), risk, and whether it
passes the brief's filter (reduces friction or a chore, makes first run or
daily use better, or solves a real user problem, without adding setup).

Phase 0 built none of these.

## Planner ideas

### 1. Guess the user's hours from their calendar instead of asking

- **What:** today every account starts with four "Hours" profiles and a
  26-row editor. Instead, look at the last few weeks of busy times and
  propose one sentence the user can accept or edit: "Weekdays 9 AM to 9 PM,
  weekends 11 to 8." The full editor stays behind "Adjust".
- **Serves:** 1 (zero chore), 4 (every step earns its place), 3 (no screen
  that needs reading).
- **Effort:** M. **Risk:** a wrong guess; mitigated by showing it in one
  line with an obvious edit.
- **Filter:** passes. Fits Phase 1 or 2.

### 2. Type deadlines the way people say them

- **What:** a deadline field that accepts "fri 5pm", "tomorrow", "next tue"
  (local parsing with a library such as chrono, no AI call, no cost), with
  the date picker as a fallback.
- **Serves:** 3, 4. **Effort:** S. **Risk:** low; show the parsed date back
  ("Friday 13 Mar, 5:00 PM") before saving.
- **Filter:** passes. Natural first step toward the brief's brain-dump input.

### 3. "What moved" line after every automatic re-plan

- **What:** when the background re-plan moves anything, store a one-line
  summary ("Moved bio review to 4 PM. Everything still fits.") and show the
  latest on the dashboard, with an undo for 10 minutes.
- **Serves:** 6 (explain in place), 5 (never shame), 1.
- **Effort:** S to M. **Risk:** low. **Filter:** passes; the brief already
  asks for the one-line message, the undo is the addition.

### 4. Complete a task instantly, sync after

- **What:** the checkbox ticks immediately and the server catches up
  (rolling back with a calm message if it fails). Today it waits about a
  second for the server.
- **Serves:** 8 (it should feel great). **Effort:** S. **Risk:** low.
- **Filter:** passes. Small, Phase 1 polish.

### 5. Use Google's change notifications instead of a 15-minute timer

- **What:** register a Google Calendar "watch" so Google tells us when a
  calendar changes, and re-plan only then. Keep one daily safety run.
- **Serves:** 1 (moves happen within seconds, not up to 15 minutes later),
  and avoids needing a paid hosting plan for frequent timers.
- **Effort:** M (watch channels expire weekly and need renewing, and the
  endpoint must verify Google's requests). **Risk:** medium.
- **Filter:** passes. See "Needs your decision" in `REVIEW.md`.

### 6. "This week is overbooked" before it becomes a problem

- **What:** when the total work due this week exceeds the open time,
  say so once, plainly, and offer the two lowest-priority items to push:
  "This week is 2 hours over. Push 'Read ch. 4' to next week?"
- **Serves:** 5, 6, and the brief's protected balance section.
- **Effort:** M. **Risk:** low. **Filter:** passes (it replaces today's
  per-task amber "could not be fitted" warnings with one useful prompt).

### 7. Learn how long things really take

- **What:** when a block ends, ask nothing; compare planned time with when
  the task was actually marked done, and quietly scale future estimates for
  that kind of task ("you usually need 1.4x"). Show the adjustment once.
- **Serves:** 1, and a real student problem (underestimating).
- **Effort:** M. **Risk:** noisy data at first; cap the adjustment.
- **Filter:** passes. Already in the brief; noting a no-question version.

### 8. Show busy time, muted, in the week (from the Phase 0.5 design review)

- **What:** draw the busy stretches read from the calendar ("Busy", no
  titles: Google's free/busy gives none) as muted rows between the planned
  blocks, the way the landing's example does. Every placement then explains
  itself ("ah, it went at 11 PM because I'm in class until 9").
- **Serves:** 1 and 5 (trust in the auto-plan). **Effort:** M (cache the
  busy intervals per re-plan; today they are read and thrown away).
  **Risk:** privacy stays the same if only start and end times are kept.
- **Filter:** passes. Phase 1, alongside Google connect.

### 9. Edit a task in place, and make the "didn't fit" notice actionable

- **What:** tap a task's title to change it, its deadline or its length.
  The "didn't fit" notice then offers the fix as a button: "Move the
  deadline to Thu?" instead of describing three fixes.
- **Serves:** 3 (user control) and 6. **Effort:** S–M (the API already
  accepts PATCH). **Risk:** low.
- **Filter:** passes. Phase 1. Today a wrong deadline means delete and add
  again, and the notice says so honestly.

### 10. One line to add a task ("bio lab report fri 5pm 2h")

- **What:** the "Add something…" field parses a deadline and length from
  plain words and shows what it understood; the form's controls become the
  correction step, not the entry step. Pairs with idea 2.
- **Serves:** 2 (≤ 3 inputs) and the landing's own promise ("just tell it
  what is due"). **Effort:** M. **Risk:** misparses; always show the
  result before saving.
- **Filter:** passes. Phase 2 (first run).
