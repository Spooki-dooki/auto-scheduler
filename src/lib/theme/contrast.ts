/**
 * WCAG 2.x contrast math. Pure functions, so the theme tests can check every
 * text/background pair the themes actually use.
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(input: string): RGBA {
  const value = input.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value);
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }
  throw new Error(`Unsupported color: ${input}`);
}

/** "#FF8A5B", 0.14 -> "rgba(255, 138, 91, 0.14)" */
export function withAlpha(color: string, alpha: number): string {
  const { r, g, b } = parseColor(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Paints `top` (possibly translucent) over an opaque `bottom`. */
export function composite(top: string, bottom: string): RGBA {
  const t = parseColor(top);
  const b = parseColor(bottom);
  const mix = (x: number, y: number) => Math.round(x * t.a + y * (1 - t.a));
  return { r: mix(t.r, b.r), g: mix(t.g, b.g), b: mix(t.b, b.b), a: 1 };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }: RGBA): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Contrast ratio of `fg` drawn on `bg`. Translucent colors are composited
 * first: `bg` onto `base` (defaults to black), then `fg` onto that.
 */
export function contrast(fg: string, bg: string, base = "#000000"): number {
  const background = composite(bg, base);
  const bgHex = toHex(background);
  const foreground = composite(fg, bgHex);
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function toHex({ r, g, b }: RGBA): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG AA: 4.5 for normal text, 3 for large text (24pt, or 18.5pt bold). */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;
