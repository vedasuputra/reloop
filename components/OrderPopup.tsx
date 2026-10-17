"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import OrderDetailView from "@/components/OrderDetailView";
import { ORDER_EVENT } from "@/components/OrderLink";
import type { OrderDetailData, OrderLabels } from "@/lib/orderDetail";

/**
 * The order popup on the Orders page. It opens instantly because the details of the orders on the page travel with the page.
 * The address gains ?order=ID while it is open (so it can be shared, and the browser's back button closes it), and the
 * previous / next buttons (or the arrow keys) move through the orders in the order the table shows them.
 */
export default function OrderPopup({ details, ids, labels, initial, pageBase }: {
  details: Record<string, OrderDetailData>; ids: string[]; labels: OrderLabels; initial: string | null; pageBase: string;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(initial && details[initial] ? initial : null);
  const [requestClose, setRequestClose] = useState(0);
  const openRef = useRef(false);
  const pushed = useRef(false); // true when this popup added the history entry (so closing can step back instead of leaving a stale ?order=)

  const urlWith = (id: string | null) => {
    const u = new URL(window.location.href);
    if (id) u.searchParams.set("order", id); else u.searchParams.delete("order");
    return u.pathname + u.search;
  };

  useEffect(() => {
    const open = (e: Event) => {
      const { id, href } = (e as CustomEvent<{ id: string; href: string }>).detail;
      if (!details[id]) { router.push(href); return; } // not on this page: use the full order page
      window.history.pushState(null, "", urlWith(id));
      pushed.current = true;
      setOpenId(id);
    };
    const pop = () => {
      const id = new URLSearchParams(window.location.search).get("order");
      if (!id) { if (openRef.current) setRequestClose((c) => c + 1); } // the back button closes it, with the same fade
      else if (details[id]) setOpenId(id);
    };
    window.addEventListener(ORDER_EVENT, open);
    window.addEventListener("popstate", pop);
    return () => { window.removeEventListener(ORDER_EVENT, open); window.removeEventListener("popstate", pop); };
  }, [details, router]);

  const index = openId ? ids.indexOf(openId) : -1;
  const prevId = index > 0 ? ids[index - 1] : null;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;
  const go = (id: string | null) => {
    if (!id || !details[id]) return;
    window.history.replaceState(null, "", urlWith(id));
    setOpenId(id);
  };

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") go(prevId);
      if (e.key === "ArrowRight") go(nextId);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  useEffect(() => { openRef.current = openId !== null; });

  const closed = () => {
    openRef.current = false;
    setRequestClose(0);
    setOpenId(null);
    if (!new URLSearchParams(window.location.search).has("order")) return;
    if (pushed.current) { pushed.current = false; window.history.back(); }
    else window.history.replaceState(null, "", urlWith(null));
  };

  const d = openId ? details[openId] : null;
  if (!openId || !d) return null;

  const box = "inline-flex h-9 items-center justify-center gap-2 rounded-[9px] border border-[#174538]/25 bg-white px-2.5 text-sm font-medium transition-colors";
  const icon = (d: string) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
  );
  return (
    <Modal onClosed={closed} requestClose={requestClose} scrollKey={openId} closeLabel={labels.close} ariaLabel={`${labels.order} ${d.id}`}
      header={
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex justify-start">
            <button type="button" onClick={() => go(prevId)} disabled={!prevId} aria-label={labels.previous} title={labels.previous}
              className={`${box} ${prevId ? "cursor-pointer hover:bg-[#FFFEF6] max-sm:w-9 max-sm:px-0" : "w-9 px-0 opacity-40"}`}>
              {icon("M10 3L5 8l5 5")}{prevId && <span className="hidden sm:inline">{prevId}</span>}
            </button>
          </div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-3xl">{d.id}</h2>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => go(nextId)} disabled={!nextId} aria-label={labels.next} title={labels.next}
              className={`${box} ${nextId ? "cursor-pointer hover:bg-[#FFFEF6] max-sm:w-9 max-sm:px-0" : "w-9 px-0 opacity-40"}`}>
              {nextId && <span className="hidden sm:inline">{nextId}</span>}{icon("M6 3l5 5-5 5")}
            </button>
            <a href={`${pageBase}&order=${d.id}`} aria-label={labels.openPage} title={labels.openPage}
              className={`${box} hidden w-9 !px-0 hover:bg-[#FFFEF6] sm:inline-flex`}>
              {icon("M6 3H3v10h10v-3M9 3h4v4M13 3L7 9")}
            </a>
          </div>
        </div>
      }>
      <div key={openId}>
        <OrderDetailView d={d} l={labels} />
      </div>
    </Modal>
  );
}
