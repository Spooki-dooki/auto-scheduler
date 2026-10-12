"use client";

import { useEffect } from "react";

import { applyAppearance } from "@/lib/theme/apply";
import { APPEARANCE_COOKIE, encodeAppearance, type Appearance } from "@/lib/theme/appearance";

/**
 * The account is the source of truth for the theme; the cookie only caches
 * it. When they disagree (first visit on a new device, or a change made on
 * another device), the account wins and the cookie is refreshed.
 */
export default function AppearanceSync({ appearance }: { appearance: Appearance | null }) {
  useEffect(() => {
    if (!appearance) return;
    const cached = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${APPEARANCE_COOKIE}=`))
      ?.split("=")[1];
    if (cached !== encodeAppearance(appearance)) applyAppearance(appearance, { animate: false });
  }, [appearance]);

  return null;
}
