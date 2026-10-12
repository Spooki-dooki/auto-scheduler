"use client";

import { CalendarDays, Clock, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cx } from "@/components/ui";

const LINKS = [
  { href: "/dashboard", label: "Schedule", Icon: CalendarDays },
  { href: "/profiles", label: "Hours", Icon: Clock },
  { href: "/settings", label: "Settings", Icon: Settings },
];

/**
 * Side navigation on wide screens; on phones the same destinations become a
 * bottom tab bar drawn like the phone app's (Calm: floating pill with icons,
 * Momentum: caps text with an accent underline). The page content sits
 * between them in the source, so keyboard order is: skip link, header, page,
 * tab bar.
 */
export default function AppNav({
  appName,
  signOut,
  children,
}: {
  appName: string;
  signOut: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-30 rounded-control bg-raised px-4 py-3 t-body text-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line px-5 py-8 lg:flex">
        <Link href="/dashboard" className="-ml-1 inline-flex min-h-touch items-center self-start rounded-control px-1 t-heading text-text">
          {appName}
        </Link>
        <nav aria-label="Main" className="mt-10 flex flex-col gap-1">
          {LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cx(
                "flex min-h-touch items-center gap-3 rounded-chip px-4 t-body transition-colors duration-[var(--motion-fast)]",
                active(href)
                  ? "bg-selected text-selected-fg momentum:bg-transparent momentum:text-text momentum:underline momentum:decoration-accent momentum:decoration-[3px] momentum:underline-offset-8"
                  : "text-soft hover:bg-pressed hover:text-text",
              )}
            >
              <Icon aria-hidden className="size-5 momentum:hidden" strokeWidth={1.75} />
              <span className="momentum:t-label">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto">{signOut}</div>
      </aside>

      <header className="flex flex-wrap items-center justify-between gap-x-4 px-gutter pt-4 lg:hidden">
        <Link href="/dashboard" className="-ml-1 inline-flex min-h-touch items-center rounded-control px-1 t-heading text-text">
          {appName}
        </Link>
        {signOut}
      </header>

      {children}

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 bg-ground px-4 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 lg:hidden momentum:border-t momentum:border-line"
      >
        <ul className="mx-auto flex max-w-md calm:rounded-chip calm:border calm:border-line calm:bg-raised calm:p-1">
          {LINKS.map(({ href, label, Icon }) => (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cx(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-center",
                  active(href)
                    ? "calm:rounded-chip calm:bg-selected calm:text-selected-fg momentum:text-text"
                    : "text-muted",
                )}
              >
                <Icon aria-hidden className="size-5 momentum:hidden" strokeWidth={1.75} />
                <span
                  className={cx(
                    "max-w-full break-words",
                    active(href) ? "t-label" : "t-caption momentum:t-label",
                  )}
                >
                  {label}
                </span>
                <span
                  aria-hidden
                  className={cx(
                    "absolute bottom-2 hidden h-[3px] w-7 momentum:block",
                    active(href) ? "bg-accent" : "bg-transparent",
                  )}
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
