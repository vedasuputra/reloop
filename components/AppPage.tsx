import { Suspense, type ReactNode } from "react";
import AppShell from "@/components/AppShell";
import AppShellSkeleton from "@/components/AppShellSkeleton";
import PageSkeleton from "@/components/PageSkeleton";

/**
 * Wrapper of every logged-in screen. While the screen's data loads, the sidebar stays on screen instead of a blank page.
 * AppShell reads the language cookie, so it sits in its own boundary; the static skeleton covers the instant before it arrives.
 */
export default function AppPage({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <Suspense fallback={<AppShellSkeleton />}>
        <AppShell><PageSkeleton /></AppShell>
      </Suspense>
    }>
      {children}
    </Suspense>
  );
}
