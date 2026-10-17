"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Public pages fade in; the logged-in app screens do not (see below). */
const FADE_PAGES = ["/", "/login", "/privacy"];

/**
 * Wraps every page. The wrapper is keyed by the page address, so it is rebuilt on every
 * page change. On the public pages the fade-in animation (in globals.css) plays each time, e.g. after
 * "Log in" or "Open the app". The app screens skip it: fading the whole page, sidebar included,
 * made every navigation flash white. They animate their own content instead.
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname} className={`${FADE_PAGES.includes(pathname) ? "rl-page " : ""}w-full flex-1`}>{children}</div>;
}
