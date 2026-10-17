"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Wraps a table. While new rows are being prepared (a filter, sort, page or chip was just used) a skeleton of grey rows covers
 * the old ones, so the table never looks frozen. It lifts as soon as the new address has arrived.
 */
export default function TableVeil({ children, rows = 9 }: { children: ReactNode; rows?: number }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const address = `${pathname}?${search}`;
  // The address the page was at when the veil went up: once the address changes, the new rows have arrived and the veil lifts
  const [busyAt, setBusyAt] = useState<string | null>(null);
  const busy = busyAt === address;
  const addressRef = useRef(address);
  useEffect(() => { addressRef.current = address; });

  useEffect(() => {
    const on = () => setBusyAt(addressRef.current);
    const off = () => setBusyAt(null);
    // links that stay on this page but change its address (sorting, page numbers, chips, clear filters)
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.pathname !== location.pathname || u.search === location.search) return;
      setBusyAt(addressRef.current);
    };
    window.addEventListener("reloop:loading", on);
    window.addEventListener("reloop:loaded", off);
    window.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("reloop:loading", on);
      window.removeEventListener("reloop:loaded", off);
      window.removeEventListener("click", click, true);
    };
  }, []);

  return (
    <div className="relative" aria-busy={busy}>
      {children}
      {busy && (
        <div aria-hidden className="absolute inset-0 z-10 overflow-hidden rounded-[9px] border border-[#174538]/15 bg-white/95 p-4">
          <div className="mb-3 h-4 w-1/3 animate-pulse rounded-[2px] bg-[#174538]/10" />
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-6 border-t border-[#174538]/10 py-3.5">
              <div className="h-4 w-20 animate-pulse rounded-[2px] bg-[#174538]/10" />
              <div className="h-4 w-32 animate-pulse rounded-[2px] bg-[#174538]/10" />
              <div className="hidden h-4 w-28 animate-pulse rounded-[2px] bg-[#174538]/10 md:block" />
              <div className="hidden h-4 w-24 animate-pulse rounded-[2px] bg-[#174538]/10 md:block" />
              <div className="ml-auto h-6 w-20 animate-pulse rounded-[6px] bg-[#174538]/10" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
