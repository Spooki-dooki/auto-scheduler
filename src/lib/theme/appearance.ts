import {
  DEFAULT_THEME,
  THEME_NAMES,
  accents,
  type ThemeName,
} from "./tokens";

/**
 * The user's chosen theme and the accent picked for each theme. Accents are
 * remembered per theme, so switching Calm -> Momentum -> Calm brings back the
 * Calm accent the user chose.
 */
export interface Appearance {
  theme: ThemeName;
  accents: Record<ThemeName, string>;
}

export const DEFAULT_APPEARANCE: Appearance = {
  theme: DEFAULT_THEME,
  accents: { calm: accents.calm[0].id, momentum: accents.momentum[0].id },
};

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && (THEME_NAMES as readonly string[]).includes(value);
}

function validAccent(theme: ThemeName, value: unknown): string {
  const list: readonly { id: string }[] = accents[theme];
  return typeof value === "string" && list.some((a) => a.id === value)
    ? value
    : DEFAULT_APPEARANCE.accents[theme];
}

/**
 * Accepts whatever was saved (possibly nothing, from before themes existed, or
 * a value this version doesn't know) and returns a valid appearance. Unknown
 * values fall back to the defaults instead of breaking the app.
 */
export function normalizeAppearance(raw: unknown): Appearance {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<Appearance>;
  const savedAccents = (obj.accents && typeof obj.accents === "object" ? obj.accents : {}) as Partial<
    Record<ThemeName, unknown>
  >;
  return {
    theme: isThemeName(obj.theme) ? obj.theme : DEFAULT_APPEARANCE.theme,
    accents: {
      calm: validAccent("calm", savedAccents.calm),
      momentum: validAccent("momentum", savedAccents.momentum),
    },
  };
}

/** Name of the cookie that caches the choice so pages render in it with no flash. */
export const APPEARANCE_COOKIE = "appearance";

/** `{theme: "momentum", accents: {calm: "sage", momentum: "crimson"}}` -> "momentum.sage.crimson" */
export function encodeAppearance(a: Appearance): string {
  const n = normalizeAppearance(a);
  return `${n.theme}.${n.accents.calm}.${n.accents.momentum}`;
}

export function decodeAppearance(value: string | undefined | null): Appearance {
  const [theme, calm, momentum] = (value ?? "").split(".");
  return normalizeAppearance({ theme, accents: { calm, momentum } });
}
