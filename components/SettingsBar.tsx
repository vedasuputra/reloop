"use client";
import { useEffect, useState } from "react";

type Item = { label: string; short?: string; value: string };

/**
 * A slim bar pinned to the top of the screen that shows the settings in use, so the user always knows what the numbers
 * are based on. It appears only once the full settings panel (the element with id `targetId`) has scrolled out of view;
 * "Change settings" scrolls back to that panel. The wrapper has no height, so it never moves the page content.
 * On phones the bar is as small as possible: just the three settings as columns (short label above the value, widths
 * automatic) and no button, since scrolling to the top gets back to the settings. Larger screens show "Label: value" with the link.
 */
export default function SettingsBar({ items, changeLabel, targetId }: {
  items: Item[]; changeLabel: string; targetId: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    // shown when the panel is off screen and above the viewport (scrolled past it)
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.bottom < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  const toPanel = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(targetId)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  return (
    <div className="sticky top-2 z-30 h-0 sm:top-5" aria-hidden={!show}>
      <div className={`absolute inset-x-0 top-0 flex items-stretch overflow-hidden rounded-[9px] bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEF6] shadow-[0_12px_32px_-12px_rgba(23,69,56,0.6)] transition-opacity duration-150 sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-8 sm:gap-y-1.5 sm:overflow-visible sm:px-5 sm:py-3.5 sm:text-sm ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {/* Phones: three columns, automatic widths */}
        <div className="grid min-w-0 flex-1 auto-cols-auto grid-flow-col gap-x-3.5 px-3.5 py-2 sm:hidden">
          {items.map((it) => (
            <div key={it.label} className="min-w-0">
              <p className="text-[10px] leading-tight opacity-70">{it.short ?? it.label}</p>
              <p className="mt-0.5 text-xs font-semibold leading-snug">{it.value}</p>
            </div>
          ))}
        </div>
        {/* Larger screens: each setting with its label, and a text link */}
        <p className="hidden min-w-0 flex-wrap items-center gap-x-5 gap-y-1 sm:flex">
          {items.map((it, i) => (
            <span key={it.label} className="flex items-center gap-x-5">
              {i > 0 && <span aria-hidden className="h-4 w-px bg-[#FFFEF6]/30" />}
              <span><span className="opacity-75">{it.label}:</span> <b className="font-semibold">{it.value}</b></span>
            </span>
          ))}
        </p>
        <button type="button" onClick={toPanel} tabIndex={show ? 0 : -1} className="hidden shrink-0 cursor-pointer font-semibold underline underline-offset-2 hover:opacity-75 sm:block">
          {changeLabel}
        </button>
      </div>
    </div>
  );
}
