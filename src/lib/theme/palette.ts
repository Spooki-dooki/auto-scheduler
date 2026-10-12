import { withAlpha } from "./contrast";
import {
  ACCENT_TINT_ALPHA,
  DESTRUCTIVE,
  accents,
  palette,
  type AccentSwatch,
  type ThemeName,
} from "./tokens";

/**
 * The resolved colors for one theme and accent. Same rules as the phone app's
 * `buildTheme()` (achieve-it `src/theme/themes.ts`), so both apps look and
 * measure the same.
 */
export interface ThemeColors {
  ground: string;
  surface: string;
  raised: string;
  line: string;
  lineStrong: string;
  track: string;
  text: string;
  textSoft: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  /** The accent when used as text or an icon on the ground. AA-safe. */
  accentInk: string;
  /** Background of a selected chip, tab or option, and its text. */
  selectedBg: string;
  selectedFg: string;
  selectedBorder: string;
  /** Edge of an input or other control: 3:1 against what is around it. */
  controlEdge: string;
  pressed: string;
  destructive: string;
}

export function accentFor(name: ThemeName, accentId: string | undefined): AccentSwatch {
  const list: readonly AccentSwatch[] = accents[name];
  return list.find((a) => a.id === accentId) ?? list[0];
}

export function themeColors(name: ThemeName, accentId?: string): ThemeColors {
  const p = palette[name];
  const accent = accentFor(name, accentId);
  const calm = name === "calm";
  return {
    ...p,
    accent: accent.color,
    onAccent: accent.onAccent,
    // Momentum's accents are too dark to read as small text on black, so
    // Momentum shows emphasis with fills and underlines and keeps text white.
    accentInk: calm ? accent.color : p.text,
    // Calm marks a selection with the soft accent tint. Momentum keeps its one
    // solid accent for the primary action, so its selections are a white
    // outline on the surface.
    selectedBg: calm ? withAlpha(accent.color, ACCENT_TINT_ALPHA) : p.surface,
    selectedFg: calm ? accent.color : p.text,
    selectedBorder: calm ? accent.color : p.lineStrong,
    pressed: calm ? "rgba(244, 238, 230, 0.06)" : "rgba(255, 255, 255, 0.08)",
    destructive: DESTRUCTIVE,
  };
}
