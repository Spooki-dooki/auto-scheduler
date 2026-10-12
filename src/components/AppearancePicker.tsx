"use client";

import { AlertCircle, Check, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { Notice, cx } from "@/components/ui";
import { appearanceCopy as copy } from "@/lib/copy";
import { applyAppearance } from "@/lib/theme/apply";
import type { Appearance } from "@/lib/theme/appearance";
import { THEME_NAMES, accents, type ThemeName } from "@/lib/theme/tokens";

/**
 * A miniature dashboard drawn in one theme. It sets its own data-theme, so the
 * same CSS variables resolve to that theme inside it. Only variable-based
 * classes here (no calm:/momentum: variants, which can't see the nearest
 * theme). Decorative: the card around it is the control.
 */
function Preview({ theme, accent }: { theme: ThemeName; accent: string }) {
  const p = copy.preview;
  return (
    <div
      aria-hidden
      data-theme={theme}
      data-accent={accent}
      // Calm's miniature is shorter (no numeral); side by side they match.
      className={cx(
        "relative overflow-hidden rounded-tile bg-ground sm:h-52",
        theme === "calm" ? "h-40" : "h-52",
      )}
    >
      <div className="absolute left-0 top-0 w-[200%] origin-top-left scale-50 p-6">
        <p className="t-display text-text">{p.greeting[theme]}</p>
        <div className="mt-5 rounded-card bg-raised p-6">
          <span
            className={cx(
              "inline-flex rounded-chip bg-selected px-3 py-1 t-label text-selected-fg",
              theme === "momentum" && "border border-selected-border",
            )}
          >
            {p.label}
          </span>
          <p className="mt-4 t-heading text-text">{p.block}</p>
          <p className="mt-2 t-small text-soft">{p.context}</p>
          {/* The same Now card the schedule draws: Momentum leads with the
              number, Calm says it. */}
          {theme === "momentum" ? (
            <p className="mt-4">
              <span className="block t-numeral text-text">{p.minutesLeft}</span>
              <span className="block t-label text-soft">min left</span>
            </p>
          ) : null}
          <div className="mt-5 h-progress overflow-hidden rounded-chip bg-track">
            <div
              className={cx(
                "h-full w-3/5 rounded-chip bg-accent",
                theme === "momentum" && "border-r-2 border-text",
              )}
            />
          </div>
          {theme === "calm" ? (
            <p className="mt-2 t-small text-soft">{p.minutesLeft} minutes left</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Arrow keys move through a radio group and choose as they go, like native
 * radios; only the chosen option is a Tab stop.
 */
function arrowChoose<T>(event: React.KeyboardEvent<HTMLElement>, options: readonly T[], index: number, pick: (option: T) => void) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!step) return;
  event.preventDefault();
  const next = (index + step + options.length) % options.length;
  pick(options[next]);
  const radios = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]');
  radios?.[next]?.focus();
}

/**
 * Settings -> Appearance: tap a theme or an accent and the whole planner
 * switches at once (crossfade, or instant with reduced motion). Saved to the
 * account and cached in a cookie.
 */
export default function AppearancePicker({ initial }: { initial: Appearance }) {
  const [appearance, setAppearance] = useState(initial);
  const [error, setError] = useState(false);

  async function choose(next: Appearance) {
    setAppearance(next);
    setError(false);
    applyAppearance(next);
    try {
      const response = await fetch("/api/appearance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) throw new Error(String(response.status));
    } catch {
      setError(true);
    }
  }

  const current = appearance.theme;
  const swatches = accents[current];

  return (
    <section aria-labelledby="appearance-heading" className="space-y-6">
      <div>
        <h2 id="appearance-heading" className="t-heading text-text">
          {copy.title}
        </h2>
        <p className="mt-1 t-small text-soft">{copy.intro}</p>
      </div>

      <div role="radiogroup" aria-label="Theme" className="grid gap-4 sm:grid-cols-2">
        {THEME_NAMES.map((name, index) => {
          const selected = current === name;
          const info = copy.themes[name];
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onKeyDown={(event) =>
                arrowChoose(event, THEME_NAMES, index, (theme) => choose({ ...appearance, theme }))
              }
              aria-label={`${info.name} theme. ${info.blurb}`}
              onClick={() => (selected ? undefined : choose({ ...appearance, theme: name }))}
              className={cx(
                "rounded-tile bg-surface p-2 text-left transition-colors duration-[var(--motion-fast)]",
                selected
                  ? "border-[length:calc(var(--outline-width)+1px)] border-accent"
                  : "border border-line hover:border-line-strong",
              )}
            >
              <Preview theme={name} accent={appearance.accents[name]} />
              <span className="block px-2 pb-2 pt-3">
                <span className="block t-body-strong text-text">{info.name}</span>
                <span className="mt-1 block t-small text-soft">{info.blurb}</span>
                {selected ? (
                  <span className="mt-2 flex items-center gap-1.5 t-label text-accent-ink">
                    <CheckCircle2 aria-hidden className="size-4" />
                    {copy.selected}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <p id="accent-label" className="mb-3 t-label text-muted">
          Accent for {copy.themes[current].name}
        </p>
        <div role="radiogroup" aria-labelledby="accent-label" className="flex flex-wrap gap-6">
          {swatches.map((s, index) => {
            const on = appearance.accents[current] === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onKeyDown={(event) =>
                  arrowChoose(event, swatches.map((option) => option.id), index, (id) =>
                    choose({ ...appearance, accents: { ...appearance.accents, [current]: id } }),
                  )
                }
                aria-label={`${s.name} accent`}
                onClick={() =>
                  on ? undefined : choose({ ...appearance, accents: { ...appearance.accents, [current]: s.id } })
                }
                className="flex min-w-touch flex-col items-center gap-2"
              >
                <span
                  className={cx(
                    "rounded-chip border-2 p-[3px]",
                    on ? "border-text" : "border-transparent",
                  )}
                >
                  <span
                    className="grid size-13 place-items-center rounded-chip"
                    style={{ backgroundColor: s.color, color: s.onAccent }}
                  >
                    {on ? <Check aria-hidden className="size-6" strokeWidth={2.5} /> : null}
                  </span>
                </span>
                <span className={cx("t-caption", on ? "text-text" : "text-muted")}>{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <Notice tone="error" icon={<AlertCircle className="size-4" />}>{copy.error}</Notice> : null}
      <p className="t-caption text-muted">{copy.savedNote}</p>
    </section>
  );
}
