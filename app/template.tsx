"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Wraps every page. The wrapper is keyed by the page address, so it is rebuilt on every
 * page change and the fade-in animation (in globals.css) plays each time, e.g. after
 * "Log in" or "Open the app".
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname} className="rl-page w-full flex-1">{children}</div>;
}
