"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

const GREEN = "bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEF6]";

/**
 * The frame of the app sidebar. On desktop it is the usual sticky column. On phones the sidebar is a drawer: a top bar with a
 * hamburger button at the left of the logo opens it from the left over a dimmed backdrop; a click on a link, on the backdrop,
 * on × or the Escape key closes it. `logo` is drawn in the top bar and again at the top of the sidebar, where `extra` (the get-started
 * rocket) sits at the right end of the same row; the rest is `children`.
 */
export default function SidebarFrame({ logo, extra, openLabel, closeLabel, children }: { logo: ReactNode; extra?: ReactNode; openLabel: string; closeLabel: string; children: ReactNode }) {
  const pathname = usePathname();
  const id = useId(); // unique per instance: the previous page may still be kept (hidden) while the next one shows
  // The page the drawer was opened on: it closes by itself once a link has taken the visitor elsewhere
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const close = () => setOpenAt(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <header className={`flex items-center gap-3 px-4 py-3 md:hidden print:hidden ${GREEN}`}>
        <button type="button" onClick={() => setOpenAt(pathname)} aria-label={openLabel} aria-expanded={open} aria-controls={id}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[9px] border border-[#FFFEF6]/40 transition-colors hover:bg-[#FFFEF6]/15">
          <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2.5 4.5h13M2.5 9h13M2.5 13.5h13" /></svg>
        </button>
        {logo}
      </header>

      {open && <div aria-hidden className="fixed inset-0 z-40 bg-[#174538]/60 md:hidden" onClick={close} />}

      <aside id={id} onClick={(e) => { if ((e.target as HTMLElement).closest("a")) close(); }}
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-8 overflow-y-auto py-7 shadow-[0_0_40px_rgba(0,0,0,0.35)] transition-[transform,visibility] duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:w-fit md:max-w-none md:shrink-0 md:translate-x-0 md:shadow-none print:hidden ${GREEN} ${open ? "translate-x-0" : "-translate-x-full max-md:invisible"}`}>
        {/* No side padding on the sidebar itself: the active link's highlight runs edge to edge */}
        {/* The logo at the left; at the right end of the row, the extra (the get-started rocket) and, on phones, the close button */}
        <div className="flex items-center justify-between gap-6 px-7">
          {logo}
          <div className="flex shrink-0 items-center gap-2">
            {extra}
            <button type="button" onClick={close} aria-label={closeLabel}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[9px] border border-[#FFFEF6]/40 transition-colors hover:bg-[#FFFEF6]/15 md:hidden">
              <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
            </button>
          </div>
        </div>
        {children}
      </aside>
    </>
  );
}
