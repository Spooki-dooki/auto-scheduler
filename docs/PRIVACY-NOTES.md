# Privacy notes: planner (auto-scheduler)

What this code collects, where it goes, and why, written from the code as it
is on 2026-10-12. This is the factual basis for a future privacy policy, not
the policy itself.

## Stored in our database (Postgres)

| Data | Why | Notes |
|---|---|---|
| Name, email, profile picture link | From Google sign-in; shows who is signed in | |
| Google access and refresh tokens | To read free/busy times and write task blocks while the user is away | Encrypted at rest (AES-256-GCM, `src/lib/crypto.ts`) |
| Login sessions | Keeps the user signed in | Deleted on sign-out |
| Tasks: title, notes, deadline, length, priority, status | The thing being scheduled | |
| Task blocks: start/end times, Google event ID | To move or remove the events we created | Without a calendar connected, blocks are kept here only and sent nowhere |
| "Hours" profiles and their weekly windows | Where tasks may be placed | |
| Time zone and which calendar to write to | Scheduling math | |
| Appearance: theme (Calm or Momentum) and accent color | Draws the planner (and later the phone app) the way the user picked | |

## Stored in the browser

| Data | Why |
|---|---|
| Login session cookie | Keeps the user signed in |
| `appearance` cookie, e.g. `momentum.apricot.cobalt` | So the first paint of every page is already in the chosen theme. Not used for tracking; holds only the theme and accent names. |

## Read from Google, not stored

- **Busy times** from the calendars the user has selected: start and end
  only. Google's free/busy API does not return titles, and we do not store
  the result.
- **Our own events** (those we tagged when creating them), to see whether
  the user moved or deleted them.

## Sent to other services

| Service | What | When |
|---|---|---|
| Google Calendar | Task title, notes, and times, as calendar events | Every re-plan |
| Resend (only if configured) | The user's email address | Magic-link sign-in |
| Vercel (hosting) | Request logs; any error the app logs | Always, once deployed |

## Not collected

No analytics, no AI calls, no location, no contacts, no event titles from
the user's own calendar events. The fonts are served from our own domain
(next/font downloads them when the app is built), so opening a page sends
nothing to Google Fonts.

## Gaps to close before real users

- **No account deletion** yet (required by the App Store once accounts
  exist). The database already deletes a user's tasks, blocks, profiles and
  tokens when the user row is deleted; it needs a button, Google token
  revocation, and removal of our events from their calendar.
- ~~Error logs may contain task titles or tokens~~ Fixed 2026-10-12: only
  an error's name and first line are logged (`src/lib/log.ts`), and a test
  stops error objects reaching `console`.
- Google scopes requested: `calendar.readonly` and `calendar.events`. Worth
  checking in Phase 1 whether `calendar.events` plus `calendar.freebusy`
  is enough, which would be narrower.
