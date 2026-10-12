---
name: Achieve It
description: A plan that runs itself, and a quiet wall between you and the scroll. Two switchable themes, Calm and Momentum, on one shared structure.
status: seed
colors:
  calm-ground: "#12100E"
  calm-surface: "#1C1915"
  calm-surface-raised: "#221D18"
  calm-line: "#2E2721"
  calm-line-strong: "#4A4038"
  calm-track: "#3A322B"
  calm-text: "#F4EEE6"
  calm-text-soft: "#D8CFC4"
  calm-text-muted: "#A89F94"
  calm-accent: "#FF8A5B"
  calm-accent-tint: "rgba(255, 138, 91, 0.14)"
  calm-on-accent: "#1A120C"
  momentum-ground: "#050505"
  momentum-surface: "#111111"
  momentum-line: "#1E1E1E"
  momentum-line-strong: "#FFFFFF"
  momentum-text: "#FFFFFF"
  momentum-text-muted: "rgba(255, 255, 255, 0.72)"
  momentum-accent: "#2F4BFF"
  momentum-on-accent: "#FFFFFF"
typography:
  calm-display:
    fontFamily: "Bricolage Grotesque"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  calm-title:
    fontFamily: "Bricolage Grotesque"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  calm-body:
    fontFamily: "Hanken Grotesk"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  calm-label:
    fontFamily: "Hanken Grotesk"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
  momentum-display:
    fontFamily: "Barlow Condensed"
    fontSize: "64px"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.005em"
  momentum-numeral:
    fontFamily: "Barlow Condensed"
    fontSize: "112px"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.02em"
  momentum-body:
    fontFamily: "Barlow"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  momentum-label:
    fontFamily: "Barlow Condensed"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  calm-card: "28px"
  calm-tile: "20px"
  calm-pill: "999px"
  momentum-all: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
  screen-gutter: "22px"
  touch-min: "44px"
components:
  calm-button-primary:
    backgroundColor: "{colors.calm-accent}"
    textColor: "{colors.calm-on-accent}"
    rounded: "{rounded.calm-pill}"
    height: "52px"
  calm-button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.calm-text}"
    rounded: "{rounded.calm-pill}"
    height: "52px"
  calm-now-card:
    backgroundColor: "{colors.calm-surface-raised}"
    rounded: "{rounded.calm-card}"
    padding: "24px"
  calm-tile:
    backgroundColor: "{colors.calm-surface}"
    rounded: "{rounded.calm-tile}"
    padding: "16px"
  momentum-button-primary:
    backgroundColor: "{colors.momentum-accent}"
    textColor: "{colors.momentum-on-accent}"
    typography: "{typography.momentum-label}"
    rounded: "{rounded.momentum-all}"
    height: "56px"
  momentum-button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.momentum-text}"
    rounded: "{rounded.momentum-all}"
    height: "56px"
  momentum-gate:
    backgroundColor: "{colors.momentum-accent}"
    textColor: "{colors.momentum-on-accent}"
---

# Design

Seed design system, chosen by Justin from three explored directions (mockups: "Achieve It — Visual Directions" canvas, directions B and C). It commits the visual world and its invariants; implementation tokens move into code (`src/theme/`) and this file is refreshed with `/impeccable document` once they exist.

## Overview

One app, two moods, one structure. Users switch between them in Settings → Appearance. Neither theme is a reskin of a template; each is a complete visual world that shares the same layout skeleton, component inventory, behavior and information.

- **Calm (default).** Warm charcoal, soft apricot, rounded forms, a breathing gate. For the easily overwhelmed and the busy: the app feels like it is on your side. Copy is gentle and specific.
- **Momentum.** Black, white, one cobalt. Condensed caps, giant numerals, square edges. For people who want a coach, not a friend. The gate takes over the screen in the accent color.

Calm is the default because the core audience is busy and easily distracted people, and the product promise is "never shame, never punish." Momentum is opt-in.

**The switch rule.** A theme may change color, typography, radius, density of ornament, motion character and a short list of voice lines (below). A theme may never change: screen structure, component order, what information is shown, tap targets, behavior, or accessibility. If something can only be achieved by a different layout, it doesn't belong in a theme.

**Light mode.** Not designed yet. Both themes are dark-only for the MVP; this is an open decision, not an omission to paper over with automatic inversion.

## Colors

**Calm.** Ground `calm-ground` is warm, not neutral black; surfaces step up in warmth (`calm-surface` → `calm-surface-raised`). One accent, `calm-accent` (apricot), used for: the current block's label, the primary button, progress fill, the active tab, and the gate countdown. Text on the accent is always `calm-on-accent` (near-black brown), never white. `calm-accent-tint` backs pills and the active tab. Secondary text is `calm-text-muted`; supporting copy that must stay readable at length uses `calm-text-soft`.

**Momentum.** Pure black ground, white text, one accent `momentum-accent` (cobalt). Text on the accent is always white. Muted text is white at 72%. Divider lines are `momentum-line`; outlined secondary buttons use a 2px white border. The gate screen's entire background is the accent.

**Both.** Contrast floor is WCAG AA for all text (all listed text/ground pairs pass; verify any new pair). Status is never color alone: a held day, a blocked app, a protected block each carry a word or icon too. No red for missed or broken: a miss is shown as an empty cell, never a warning color. No gradients.

User-selectable accent swatches are allowed per theme (Calm: apricot, gold `#F2C14E`, sage `#9FD8B7`; Momentum: cobalt, crimson `#D3263A`, green `#0B7A55`), each pre-checked for contrast against its on-accent text color.

## Typography

**Calm.** Display and titles: Bricolage Grotesque 600, tight tracking. Body, labels, numbers: Hanken Grotesk. Sentence case everywhere. Numbers sit inside sentences ("38 minutes left"), not as giant figures.

**Momentum.** Display, labels, numerals: Barlow Condensed 700–800, ALL CAPS for headings, labels and tabs, tracked +0.06–0.12em on small labels. Body sentences: Barlow, sentence case (never set paragraphs in caps). Time is shown as a giant numeral (`momentum-numeral`).

**Both.** Load fonts with `expo-font` on mobile and `next/font` on web; ship a system-font fallback that keeps layout stable. Respect Dynamic Type / user text size: type tokens are base sizes, scaled by the platform, and layouts must not clip at the largest accessibility size. Tabular numerals for any ticking time.

## Layout

Shared skeleton for every theme. Phone first, 390pt reference, 22pt gutter, single column.

- **Today:** greeting or date → the one current block (title, time left, progress, primary action "Done", secondary "More time / I'm behind") → "Later" (next 3 items) → focus status (which apps are resting, streak) → tab bar.
- **Gate:** status line (which app, when its window opens) → the confront moment (identity line, cost, streak) → countdown → primary "Back to [current block]" → secondary disabled "Open anyway in Ns".
- **Tab bar:** four tabs, Today / Plan / Focus / You. Calm skins it as a floating pill bar with icon + label; Momentum as caps text tabs with an accent underline. Same tabs, order and hit areas.
- One primary action per screen. Content never hides behind the tab bar; the last row clears it.
- The web planner (auto-scheduler) uses the same themes and tokens at desktop widths: content max-width ~720px for reading surfaces, side navigation that collapses to the same four destinations on phones.

## Elevation & Depth

Flat. Depth comes from surface steps (ground → surface → raised), not shadows. No drop shadows on cards, no glass, no blur. The only "lift" is the Calm floating tab bar, which uses a 1px `calm-line` border, not a shadow. Momentum has no elevation at all: lines and fills only.

## Shapes

**Calm.** Big soft radii: cards 28, tiles 20, buttons and pills fully round. The gate uses three concentric circles that slowly breathe (scale 0.96 ↔ 1.0, 4s cycle; static when Reduce Motion is on).

**Momentum.** 4px radius on everything that has a box. Hard horizontal rules between list rows. Progress bars are 8px tall and square-ended.

## Components

Every component exists once in code with a `theme` input; there are no `CalmButton` and `MomentumButton` forks.

- **Button:** primary (accent fill), secondary (outline), text. Min height 52 (Calm) / 56 (Momentum); never below 44. Disabled shows the reason in its label ("Open anyway in 18s"), never just greys out.
- **Now card:** the current block. Label pill/tag, title, one line of context, progress, time left, two actions.
- **Later list:** Calm = horizontal tiles; Momentum = ruled rows with big times. Same three items.
- **Tracker:** 30-day chain. Held = filled accent; missed = empty surface cell (no red); today = outlined. A single miss never breaks the visual chain's language ("never miss twice").
- **Gate:** see Layout. Calm = breathing circles + soft copy; Momentum = full-bleed accent + caps copy.
- **Tab bar:** see Layout.
- **Theme switch:** Settings → Appearance. Two large preview cards (a miniature Today screen in each theme), tap to apply instantly, no confirmation, no restart. Accent swatches below. Choice persists per user (synced to the account, cached on device).

**Native behavior (both):** the brand faces and colors carry identity; behavior stays native. On iOS use platform controls (Switch, sheets, action sheets, swipe actions, system pickers), SF Symbols for icons (via `expo-symbols`, with an SVG fallback on web and Android), system transitions, and grouped lists for settings. Never hand-roll a control the platform already has.

**Motion (both):** 180–240ms ease-out for state changes; the "Done" moment gets the one celebratory beat (cell fill + success haptic). Theme switch crossfades 200ms. Everything honors Reduce Motion.

**Voice lines that change with theme** (all other copy is shared, calm and direct):

| Moment | Calm | Momentum |
|---|---|---|
| Today greeting | "Good afternoon." + "Three things left today. All of them fit." | "THU 15 OCT" + streak badge |
| Gate headline | "Instagram can wait." | "HOLD THE LINE." |
| Gate identity | "You said you're someone who builds things." | "BUILDERS DON'T OPEN INSTAGRAM AT 3:52." |
| Behind button | "More time" | "I'M BEHIND" |
| Streak | "12 calm days in a row." | "12-DAY STREAK" |

Keep this table in the centralized copy file; add a line only when the tone difference genuinely matters.

## Do's and Don'ts

- **Do** keep one accent per theme and spend it only on what matters right now.
- **Do** design both themes for every new screen before calling it done, and screenshot both.
- **Do** let numbers carry meaning (time left, hours spent, streak days), never decoration.
- **Don't** add gradients, glassmorphism, drop shadows, emoji icons, or purple-to-blue anything.
- **Don't** use red or warning colors for a missed day, a slip, or a broken streak. No shame states.
- **Don't** put copy in all caps in Calm, or full paragraphs in caps in Momentum.
- **Don't** fork layouts per theme. If Momentum "needs" a different layout, the design is wrong.
- **Don't** show the real Instagram/TikTok logos; use neutral app glyphs or the system app icon where the platform provides it.
