/**
 * Raw design tokens, copied from DESIGN.md (repo root). This is the only place
 * in the web app where a color, font, size or duration is written as a
 * literal; `css.ts` turns them into CSS variables and every page uses those.
 *
 * This file is kept identical to `src/theme/tokens.ts` in the achieve-it
 * (phone) repo until both apps share a package (docs/DECISIONS.md, X-8).
 * If DESIGN.md changes, change it in both.
 */

export type ThemeName = "calm" | "momentum";

export const THEME_NAMES: readonly ThemeName[] = ["calm", "momentum"];

export const DEFAULT_THEME: ThemeName = "calm";

/** Surfaces, lines and text for each theme. Accents are separate (below). */
export const palette = {
  calm: {
    ground: "#12100E",
    surface: "#1C1915",
    raised: "#221D18",
    line: "#2E2721",
    lineStrong: "#4A4038",
    track: "#3A322B",
    // Edge of inputs and other controls: 3:1 against the surfaces (WCAG
    // non-text contrast). Not in DESIGN.md; derived from its warm grays.
    controlEdge: "#7A6E62",
    text: "#F4EEE6",
    textSoft: "#D8CFC4",
    textMuted: "#A89F94",
  },
  momentum: {
    ground: "#050505",
    surface: "#111111",
    // Momentum has no raised step: "lines and fills only".
    raised: "#111111",
    line: "#1E1E1E",
    lineStrong: "#FFFFFF",
    track: "#1E1E1E",
    controlEdge: "rgba(255, 255, 255, 0.5)",
    text: "#FFFFFF",
    // Momentum has one secondary text level: white at 72%.
    textSoft: "rgba(255, 255, 255, 0.72)",
    textMuted: "rgba(255, 255, 255, 0.72)",
  },
} as const;

/**
 * Destructive actions only (erase data, stop managing an app, remove a
 * window). This is iOS's dark-mode system red. It is never used for a missed
 * day, a slip, a blocked app or any other "shame" state (DESIGN.md).
 */
export const DESTRUCTIVE = "#FF453A";

export interface AccentSwatch {
  id: string;
  name: string;
  color: string;
  /** Text and icons drawn on top of the accent fill. */
  onAccent: string;
}

/** User-selectable accents. The first entry of each list is the default. */
export const accents = {
  calm: [
    { id: "apricot", name: "Apricot", color: "#FF8A5B", onAccent: "#1A120C" },
    { id: "gold", name: "Gold", color: "#F2C14E", onAccent: "#1A120C" },
    { id: "sage", name: "Sage", color: "#9FD8B7", onAccent: "#1A120C" },
  ],
  momentum: [
    { id: "cobalt", name: "Cobalt", color: "#2F4BFF", onAccent: "#FFFFFF" },
    { id: "crimson", name: "Crimson", color: "#D3263A", onAccent: "#FFFFFF" },
    { id: "green", name: "Green", color: "#0B7A55", onAccent: "#FFFFFF" },
  ],
} as const satisfies Record<ThemeName, readonly AccentSwatch[]>;

export type CalmAccentId = (typeof accents.calm)[number]["id"];
export type MomentumAccentId = (typeof accents.momentum)[number]["id"];

/** Calm backs pills and the active tab with the accent at 14% (DESIGN.md). */
export const ACCENT_TINT_ALPHA = 0.14;

/**
 * Font files. Each weight is its own file, registered under these names by
 * `expo-font` in the root layout.
 */
export const fontFiles = {
  BricolageGrotesque_600SemiBold: "BricolageGrotesque_600SemiBold",
  HankenGrotesk_400Regular: "HankenGrotesk_400Regular",
  HankenGrotesk_600SemiBold: "HankenGrotesk_600SemiBold",
  Barlow_400Regular: "Barlow_400Regular",
  Barlow_600SemiBold: "Barlow_600SemiBold",
  BarlowCondensed_700Bold: "BarlowCondensed_700Bold",
  BarlowCondensed_800ExtraBold: "BarlowCondensed_800ExtraBold",
} as const;

type FontFile = keyof typeof fontFiles;

/** Weight used when the brand font failed to load and the system font stands in. */
type Weight = "400" | "600" | "700" | "800";

export interface TypeToken {
  font: FontFile;
  weight: Weight;
  size: number;
  lineHeight: number;
  /** Points, not em. */
  letterSpacing?: number;
  caps?: boolean;
}

export type TypeRole =
  | "display"
  | "title"
  | "heading"
  | "body"
  | "bodyStrong"
  | "small"
  | "label"
  | "caption"
  | "numeral"
  | "button";

const em = (size: number, value: number) => Math.round(size * value * 100) / 100;

/**
 * DESIGN.md names display, title, body and label (Calm) and display, numeral,
 * body and label (Momentum). The other roles are derived steps on the same
 * scale so every screen has a heading, a small and a caption size to use.
 */
export const typeScale: Record<ThemeName, Record<TypeRole, TypeToken>> = {
  calm: {
    display: { font: "BricolageGrotesque_600SemiBold", weight: "600", size: 34, lineHeight: 39, letterSpacing: em(34, -0.02) },
    title: { font: "BricolageGrotesque_600SemiBold", weight: "600", size: 30, lineHeight: 33, letterSpacing: em(30, -0.02) },
    heading: { font: "BricolageGrotesque_600SemiBold", weight: "600", size: 21, lineHeight: 28, letterSpacing: em(21, -0.01) },
    body: { font: "HankenGrotesk_400Regular", weight: "400", size: 16, lineHeight: 23 },
    bodyStrong: { font: "HankenGrotesk_600SemiBold", weight: "600", size: 16, lineHeight: 23 },
    small: { font: "HankenGrotesk_400Regular", weight: "400", size: 14, lineHeight: 20 },
    label: { font: "HankenGrotesk_600SemiBold", weight: "600", size: 13, lineHeight: 17 },
    caption: { font: "HankenGrotesk_400Regular", weight: "400", size: 13, lineHeight: 18 },
    numeral: { font: "BricolageGrotesque_600SemiBold", weight: "600", size: 48, lineHeight: 52, letterSpacing: em(48, -0.02) },
    button: { font: "HankenGrotesk_600SemiBold", weight: "600", size: 16, lineHeight: 20 },
  },
  momentum: {
    display: { font: "BarlowCondensed_800ExtraBold", weight: "800", size: 64, lineHeight: 59, letterSpacing: em(64, -0.005), caps: true },
    title: { font: "BarlowCondensed_800ExtraBold", weight: "800", size: 40, lineHeight: 38, letterSpacing: em(40, -0.005), caps: true },
    heading: { font: "BarlowCondensed_700Bold", weight: "700", size: 24, lineHeight: 25, letterSpacing: em(24, 0.01), caps: true },
    body: { font: "Barlow_400Regular", weight: "400", size: 15, lineHeight: 21 },
    bodyStrong: { font: "Barlow_600SemiBold", weight: "600", size: 15, lineHeight: 21 },
    small: { font: "Barlow_400Regular", weight: "400", size: 14, lineHeight: 19 },
    label: { font: "BarlowCondensed_700Bold", weight: "700", size: 14, lineHeight: 17, letterSpacing: em(14, 0.1), caps: true },
    caption: { font: "Barlow_400Regular", weight: "400", size: 13, lineHeight: 18 },
    numeral: { font: "BarlowCondensed_800ExtraBold", weight: "800", size: 112, lineHeight: 101, letterSpacing: em(112, -0.02) },
    button: { font: "BarlowCondensed_700Bold", weight: "700", size: 16, lineHeight: 19, letterSpacing: em(16, 0.1), caps: true },
  },
};

export const radii = {
  calm: { card: 28, tile: 20, control: 999, chip: 999, input: 20, cell: 6, glyph: 12 },
  momentum: { card: 4, tile: 4, control: 4, chip: 4, input: 4, cell: 4, glyph: 4 },
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  /** Left and right page margin on phones. */
  gutter: 22,
} as const;

/** Apple's minimum hit area. Nothing tappable is smaller. */
export const TOUCH_MIN = 44;

export const controlSize = {
  calm: { buttonHeight: 52, outlineWidth: 1, progressHeight: 8 },
  momentum: { buttonHeight: 56, outlineWidth: 2, progressHeight: 8 },
} as const;

export const motion = {
  /** State changes: 180–240ms ease-out. */
  fast: 180,
  base: 220,
  slow: 240,
  themeCrossfade: 200,
  /** The Calm gate's circles: one full breath (in and out). */
  breathCycle: 4000,
  breathMinScale: 0.96,
} as const;

/** Big numerals already fill the screen; cap how far Dynamic Type grows them. */
export const MAX_SCALE = {
  numeral: 1.2,
  display: 1.4,
  title: 1.6,
  /** iOS tab bar labels don't grow with Dynamic Type either. */
  tab: 1.2,
  /** Single letters in fixed rows (day toggles, chart axes). */
  glyph: 1.5,
} as const;

/** Opacity of anything being pressed, everywhere. */
export const PRESSED_OPACITY = 0.82;

/** Switch thumbs are white on every platform, like iOS. */
export const SWITCH_THUMB = "#FFFFFF";
