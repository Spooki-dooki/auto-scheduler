import { APPEARANCE_COOKIE, encodeAppearance, type Appearance } from "./appearance";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => unknown;
};

/**
 * Applies a theme to the page right away (browser only). A theme change
 * crossfades through the View Transitions API where the browser has it and
 * the visitor hasn't asked for reduced motion; otherwise it just switches.
 * The cookie keeps the next page load in the same theme.
 */
export function applyAppearance(appearance: Appearance, { animate = true } = {}): void {
  const root = document.documentElement;
  const update = () => {
    root.dataset.theme = appearance.theme;
    root.dataset.accent = appearance.accents[appearance.theme];
  };

  const doc = document as ViewTransitionDocument;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (animate && !reduce && doc.startViewTransition && root.dataset.theme !== appearance.theme) {
    doc.startViewTransition(update);
  } else {
    update();
  }

  document.cookie = `${APPEARANCE_COOKIE}=${encodeAppearance(appearance)}; path=/; max-age=31536000; samesite=lax`;
}
