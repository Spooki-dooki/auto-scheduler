/**
 * User-facing names and the copy added with the design system. The voice
 * rules are in CLAUDE.md section 6 and DESIGN.md; the theme-specific lines
 * match the phone app's `src/copy/index.ts`.
 */

/**
 * Working name of the merged product (PRODUCT_BRIEF.md: "Achieve It", not
 * final). The web planner is its companion, so it shows the same name.
 * Change it here.
 */
export const APP_NAME = "Achieve It";

export const appearanceCopy = {
  title: "Appearance",
  intro: "Same planner, two moods. Switch any time; nothing else changes.",
  selected: "Selected",
  savedNote: "Saved to your account, so the phone app can follow it once it signs in.",
  error: "Couldn't save that. It's applied here; try again to keep it.",
  themes: {
    calm: { name: "Calm", blurb: "Warm and soft. The app is on your side." },
    momentum: { name: "Momentum", blurb: "Black, white, one bold color. A coach." },
  },
  preview: {
    greeting: { calm: "Good afternoon.", momentum: "Thu 15 Oct" },
    label: "Now",
    block: "Bio 201 lab report",
    context: "3:00 – 4:30 PM · 38 minutes left",
    done: "Done",
  },
} as const;
