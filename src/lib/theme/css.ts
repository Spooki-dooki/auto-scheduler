import { themeColors } from "./palette";
import {
  THEME_NAMES,
  TOUCH_MIN,
  accents,
  controlSize,
  motion,
  radii,
  space,
  typeScale,
  type ThemeName,
  type TypeRole,
  type TypeToken,
} from "./tokens";

/*
 * Turns the tokens into CSS: one block of custom properties per theme and per
 * accent, plus one class per type role (`.t-display`, `.t-body`...). The root
 * layout inlines the result, Tailwind maps the properties to utilities
 * (globals.css), and switching theme is just changing `data-theme` and
 * `data-accent` on an element. Any element can carry them, which is how the
 * Appearance previews show the other theme.
 */

/** next/font exposes each family as a CSS variable (see app/layout.tsx). */
const FONT: Record<TypeToken["font"], { family: string; weight: number }> = {
  BricolageGrotesque_600SemiBold: { family: "var(--font-bricolage)", weight: 600 },
  HankenGrotesk_400Regular: { family: "var(--font-hanken)", weight: 400 },
  HankenGrotesk_600SemiBold: { family: "var(--font-hanken)", weight: 600 },
  Barlow_400Regular: { family: "var(--font-barlow)", weight: 400 },
  Barlow_600SemiBold: { family: "var(--font-barlow)", weight: 600 },
  BarlowCondensed_700Bold: { family: "var(--font-barlow-condensed)", weight: 700 },
  BarlowCondensed_800ExtraBold: { family: "var(--font-barlow-condensed)", weight: 800 },
};

const ROLES = Object.keys(typeScale.calm) as TypeRole[];

// Sizes in rem so the browser's text-size setting scales them (the web's
// Dynamic Type); line height and tracking relative to the size.
const rem = (px: number) => `${px / 16}rem`;
const ratio = (a: number, b: number) => `${Math.round((a / b) * 1000) / 1000}`;

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function block(selector: string, vars: Record<string, string | number>): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

function themeVars(name: ThemeName): Record<string, string | number> {
  const colors = themeColors(name);
  const vars: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(colors)) vars[kebab(key)] = value;
  for (const [key, value] of Object.entries(radii[name])) vars[`radius-${key}`] = `${value}px`;
  vars["button-height"] = `${controlSize[name].buttonHeight}px`;
  vars["outline-width"] = `${controlSize[name].outlineWidth}px`;
  vars["progress-height"] = `${controlSize[name].progressHeight}px`;
  for (const role of ROLES) {
    const t = typeScale[name][role];
    const font = FONT[t.font];
    vars[`t-${role}-family`] = font.family;
    vars[`t-${role}-weight`] = font.weight;
    vars[`t-${role}-size`] = rem(t.size);
    vars[`t-${role}-lh`] = ratio(t.lineHeight, t.size);
    vars[`t-${role}-ls`] = t.letterSpacing ? `${ratio(t.letterSpacing, t.size)}em` : "0";
    vars[`t-${role}-case`] = t.caps ? "uppercase" : "none";
  }
  return vars;
}

function accentVars(name: ThemeName, accentId: string): Record<string, string> {
  const c = themeColors(name, accentId);
  return {
    accent: c.accent,
    "on-accent": c.onAccent,
    "accent-ink": c.accentInk,
    "selected-bg": c.selectedBg,
    "selected-fg": c.selectedFg,
    "selected-border": c.selectedBorder,
  };
}

export function themeStylesheet(): string {
  const parts: string[] = [
    block(":root", {
      gutter: `${space.gutter}px`,
      "touch-min": `${TOUCH_MIN}px`,
      "motion-fast": `${motion.fast}ms`,
      "motion-base": `${motion.base}ms`,
      "motion-theme": `${motion.themeCrossfade}ms`,
    }),
  ];
  for (const name of THEME_NAMES) {
    parts.push(block(`[data-theme="${name}"]`, themeVars(name)));
    for (const a of accents[name]) {
      parts.push(block(`[data-theme="${name}"][data-accent="${a.id}"]`, accentVars(name, a.id)));
    }
  }
  return parts.join("\n");
}
