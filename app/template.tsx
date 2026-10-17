import type { ReactNode } from "react";

/**
 * Wraps every page and is re-created on each navigation, so each new page
 * (e.g. after "Log in" or "Open the app") fades in instead of appearing instantly.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="rl-page w-full flex-1">{children}</div>;
}
