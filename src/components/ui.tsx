import type { ComponentProps, ReactNode } from "react";

/*
 * The planner's component kit. Every class here reads the theme through CSS
 * variables (src/lib/theme/css.ts), so one component draws itself as Calm or
 * Momentum. Server-safe: no hooks.
 */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "text" | "destructive";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 t-button transition-[opacity,background-color] duration-[var(--motion-fast)] disabled:cursor-not-allowed";

const BUTTON: Record<ButtonVariant, string> = {
  primary:
    "min-h-button rounded-control bg-accent px-6 text-on-accent hover:opacity-90 disabled:bg-track disabled:text-muted disabled:hover:opacity-100",
  secondary:
    "min-h-button rounded-control border-[length:var(--outline-width)] border-line-strong px-6 text-text hover:bg-pressed disabled:border-line disabled:text-muted",
  text: "min-h-touch rounded-control px-3 text-soft hover:text-text disabled:text-muted",
  destructive: "min-h-touch rounded-control px-3 text-destructive hover:opacity-80",
};

export function buttonClass(variant: ButtonVariant = "primary", extra?: string): string {
  return cx(BUTTON_BASE, BUTTON[variant], extra);
}

/**
 * A button. When `disabled`, `disabledLabel` says why (DESIGN.md: never just
 * grey out).
 */
export function Button({
  variant = "primary",
  className,
  disabledLabel,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: ButtonVariant; disabledLabel?: string }) {
  return (
    <button className={buttonClass(variant, className)} {...rest}>
      {rest.disabled && disabledLabel ? disabledLabel : children}
    </button>
  );
}

/** An input that sizes to its content (times, short numbers). */
export const inputBase =
  "min-h-button rounded-input border border-control-edge bg-surface px-4 py-3 t-body text-text";

/** An input that fills its row. */
export const inputClass = cx(inputBase, "w-full");

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block t-small text-soft">
      {children}
    </label>
  );
}

/** Names a group. Sentence case in Calm, tracked caps in Momentum. */
export function SectionLabel({
  children,
  as: Tag = "h2",
  className,
}: {
  children: ReactNode;
  as?: "h2" | "h3" | "p";
  className?: string;
}) {
  return <Tag className={cx("t-label text-muted", className)}>{children}</Tag>;
}

/** A filled block: Calm's soft warm tile, Momentum's flat black box. */
export function Surface({
  children,
  size = "tile",
  tone = "surface",
  className,
  as: Tag = "div",
}: {
  children?: ReactNode;
  size?: "tile" | "card";
  tone?: "surface" | "raised";
  className?: string;
  as?: "div" | "section" | "li" | "form";
}) {
  return (
    <Tag
      className={cx(
        size === "card" ? "rounded-card p-6" : "rounded-tile p-4",
        tone === "raised" ? "bg-raised" : "bg-surface",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** A short status tag. */
export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "accent" | "neutral";
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-chip px-3 py-1 t-label",
        tone === "accent"
          ? "bg-selected text-selected-fg momentum:border momentum:border-selected-border"
          : "border border-line-strong text-soft",
      )}
    >
      {children}
    </span>
  );
}

/** A small inline problem or note: an icon and words, never color alone. */
export function Notice({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 t-small text-text">
      <span className="mt-0.5 shrink-0 text-accent-ink" aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </p>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-progress overflow-hidden rounded-chip bg-track momentum:rounded-none"
    >
      <div className="h-full rounded-chip bg-accent momentum:rounded-none" style={{ width: `${pct}%` }} />
    </div>
  );
}
