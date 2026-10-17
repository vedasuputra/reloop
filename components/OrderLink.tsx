"use client";
import type { ReactNode } from "react";

export const ORDER_EVENT = "reloop:order-open";

/**
 * An order id that opens the order popup. A normal click opens the popup at once; a new-tab click (or no script) still goes to
 * the full order page at `href`.
 */
export default function OrderLink({ id, href, className, children }: { id: string; href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} data-no-loading className={className}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(ORDER_EVENT, { detail: { id, href } }));
      }}>
      {children}
    </a>
  );
}
