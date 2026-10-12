import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { cookies } from "next/headers";

import { APP_NAME } from "@/lib/copy";
import { APPEARANCE_COOKIE, decodeAppearance } from "@/lib/theme/appearance";
import { themeStylesheet } from "@/lib/theme/css";

import "./globals.css";

// DESIGN.md's four faces, self-hosted by next/font (nothing is fetched from
// Google at runtime), each exposed as a CSS variable the type roles use.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-bricolage",
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-hanken",
  display: "swap",
});
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-barlow",
  display: "swap",
  // Momentum only: fetched when a Momentum page asks for it, not preloaded
  // on every page.
  preload: false,
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
  // Momentum only: fetched when a Momentum page asks for it, not preloaded
  // on every page.
  preload: false,
});

const THEME_CSS = themeStylesheet();

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description:
    "Dump in your classes, shifts, and deadlines. Get an organized calendar back.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The chosen theme is cached in a cookie so the very first paint is right.
  const appearance = decodeAppearance((await cookies()).get(APPEARANCE_COOKIE)?.value);
  const fonts = [bricolage, hanken, barlow, barlowCondensed].map((f) => f.variable).join(" ");

  return (
    <html
      lang="en"
      className={fonts}
      data-theme={appearance.theme}
      data-accent={appearance.accents[appearance.theme]}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
