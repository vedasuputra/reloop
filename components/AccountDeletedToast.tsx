"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

const noSubscribe = () => () => {};
const isVietnamese = () => document.cookie.includes("lang=vi");

/**
 * Tells the visitor that their account has been deleted: after the deletion the visitor lands on "/?deleted=1", and this box
 * appears in the same corner as the "Loading…" box, with a check mark. It goes away by itself after a few seconds.
 * It sits in the root layout, which stays mounted while the visitor moves between pages, so the address is read with
 * useSearchParams (it follows the navigation) rather than once from the browser.
 */
export default function AccountDeletedToast() {
  const on = useSearchParams().get("deleted") === "1";
  const vi = useSyncExternalStore(noSubscribe, isVietnamese, () => false); // the cookie says which language
  const [gone, setGone] = useState(false);
  const show = on && !gone;

  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => {
      setGone(true);
      history.replaceState(null, "", location.pathname); // the box must not come back on a reload
    }, 6000);
    return () => clearTimeout(id);
  }, [show]);

  if (!show) return null;
  return (
    <div role="status" aria-live="polite"
      style={{ position: "fixed", top: 16, right: 16, zIndex: 2000 }}
      className="flex items-center gap-2.5 rounded-[9px] border border-[#174538]/20 bg-white px-4 py-2 text-sm font-medium text-[#174538] shadow-lg">
      <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#b7dccf] bg-[#DEF4EE]">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#2a7e67" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.3 5 8.8l4.5-5.6" /></svg>
      </span>
      {vi ? "Tài khoản của bạn đã được xóa." : "Your account has been deleted."}
    </div>
  );
}
