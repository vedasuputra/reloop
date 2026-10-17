"use client";
import type { ReactNode } from "react";

/** In-page link (#section) that glides to the section instead of jumping. */
export default function SmoothLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={className} style={{ cursor: "pointer" }}
      onClick={(e) => {
        const el = document.getElementById(href.replace(/^#/, ""));
        if (!el) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        history.replaceState(null, "", href);
      }}>
      {children}
    </a>
  );
}
