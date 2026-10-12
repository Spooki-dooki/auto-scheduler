import { describe, expect, it } from "vitest";

import {
  DEFAULT_APPEARANCE,
  decodeAppearance,
  encodeAppearance,
  normalizeAppearance,
} from "@/lib/theme/appearance";
import { AA_LARGE, AA_TEXT, contrast } from "@/lib/theme/contrast";
import { themeStylesheet } from "@/lib/theme/css";
import { themeColors, type ThemeColors } from "@/lib/theme/palette";
import { MAX_SCALE, THEME_NAMES, accents, palette, typeScale } from "@/lib/theme/tokens";

const ALL = THEME_NAMES.flatMap((name) =>
  accents[name].map((a) => [`${name}/${a.id}`, themeColors(name, a.id)] as const),
);

const surfaces = (c: ThemeColors) => [c.ground, c.surface, c.raised];

describe("DESIGN.md tokens are in code exactly", () => {
  it("has each theme's ground, text and default accent", () => {
    expect(palette.calm.ground).toBe("#12100E");
    expect(accents.calm[0].color).toBe("#FF8A5B");
    expect(palette.momentum.ground).toBe("#050505");
    expect(accents.momentum[0].color).toBe("#2F4BFF");
  });

  it("offers DESIGN.md's three swatches per theme", () => {
    expect(accents.calm.map((a) => a.color)).toEqual(["#FF8A5B", "#F2C14E", "#9FD8B7"]);
    expect(accents.momentum.map((a) => a.color)).toEqual(["#2F4BFF", "#D3263A", "#0B7A55"]);
  });
});

describe("WCAG AA for every pair the planner draws", () => {
  it.each(ALL)("%s: text on every surface", (_, c) => {
    for (const bg of surfaces(c)) {
      for (const fg of [c.text, c.textSoft, c.textMuted, c.accentInk, c.destructive]) {
        expect(contrast(fg, bg, c.ground), `${fg} on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it.each(ALL)("%s: buttons and selections", (_, c) => {
    expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.selectedFg, c.selectedBg, c.surface)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrast(c.textMuted, c.track, c.ground)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(ALL)("%s: tints drawn over the ground and raised surfaces", (_, c) => {
    // The Calm "Now" tag, active tab and nav pill sit on ground and raised too.
    for (const base of [c.ground, c.raised]) {
      expect(contrast(c.selectedFg, c.selectedBg, base)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it.each(ALL)("%s: the progress fill can be told from its track", (name, c) => {
    // Calm: the fill itself. Momentum's cobalt is too close to its track, so
    // the fill carries a text-colored leading edge (ui.tsx, ProgressBar).
    const edge = name.startsWith("momentum") ? c.text : c.accent;
    expect(contrast(edge, c.track, c.ground)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it.each(ALL)("%s: input edges, selection outlines and accent fills reach 3:1", (_, c) => {
    for (const bg of surfaces(c)) {
      expect(contrast(c.controlEdge, bg, c.ground)).toBeGreaterThanOrEqual(AA_LARGE);
      expect(contrast(c.selectedBorder, bg, c.ground)).toBeGreaterThanOrEqual(AA_LARGE);
      expect(contrast(c.accent, bg, c.ground)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });
});

describe("generated stylesheet", () => {
  const css = themeStylesheet();

  it("defines every theme and every accent", () => {
    for (const name of THEME_NAMES) {
      expect(css).toContain(`[data-theme="${name}"] {`);
      for (const a of accents[name]) {
        expect(css).toContain(`[data-theme="${name}"][data-accent="${a.id}"] {`);
      }
    }
  });

  it("sets every type role for both themes, in rem so browser text size scales it", () => {
    for (const role of Object.keys(typeScale.calm)) {
      const size = typeScale.calm[role as keyof typeof typeScale.calm].size;
      const cap = MAX_SCALE[role as keyof typeof MAX_SCALE];
      expect(css).toContain(
        cap
          ? `--t-${role}-size: min(${size / 16}rem, ${Math.round(size * cap)}px);`
          : `--t-${role}-size: ${size / 16}rem;`,
      );
      expect(css).toContain(`--t-${role}-case:`);
    }
    expect(css).toContain("--t-label-case: uppercase;");
    expect(css).toContain("--t-body-case: none;");
  });

  it("writes no color that isn't a token", () => {
    const hexes = css.match(/#[0-9A-Fa-f]{6}/g) ?? [];
    const known = new Set(
      [
        ...THEME_NAMES.flatMap((n) => Object.values(palette[n])),
        ...THEME_NAMES.flatMap((n) => accents[n].flatMap((a) => [a.color, a.onAccent])),
        "#FF453A",
      ].map((h) => h.toUpperCase()),
    );
    for (const hex of hexes) expect(known.has(hex.toUpperCase()), hex).toBe(true);
  });
});

describe("saved appearance", () => {
  it("round-trips through the cookie", () => {
    const a = { theme: "momentum" as const, accents: { calm: "sage", momentum: "crimson" } };
    expect(encodeAppearance(a)).toBe("momentum.sage.crimson");
    expect(decodeAppearance("momentum.sage.crimson")).toEqual(a);
  });

  it("falls back to Calm for a missing or tampered cookie", () => {
    expect(decodeAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(decodeAppearance("neon.<script>.x")).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance({ theme: "momentum", accents: { calm: "cobalt" } })).toEqual({
      theme: "momentum",
      accents: { calm: "apricot", momentum: "cobalt" },
    });
  });
});

describe("deadline wording", () => {
  it("says the due date passed for any deadline in the past, even earlier today", async () => {
    const { formatDeadline } = await import("@/lib/format");
    const earlier = new Date(Date.now() - 60 * 60_000).toISOString();
    expect(formatDeadline(earlier, "America/New_York")).toMatch(/due date passed$/);
    const soon = new Date(Date.now() + 60 * 60_000).toISOString();
    expect(formatDeadline(soon, "America/New_York")).not.toMatch(/passed|overdue/);
  });
});
