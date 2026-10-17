"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Small "Loading…" box in the top-right corner whenever the user clicks an internal link,
 * submits a form, or switches language. It hides as soon as the address changes (the new page
 * arrived) or, as a fallback, after 20 seconds. Other components can trigger it with
 * window.dispatchEvent(new Event("reloop:loading")) and stop it with "reloop:loaded".
 */
export default function LoadingIndicator() {
  const [busy, setBusy] = useState(false);
  const [vi, setVi] = useState(false);
  const [mode, setMode] = useState<"page" | "download" | "failed">("page");
  const startHref = useRef("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let shownAt = 0;
    // keep the box up for at least 500 ms so it is readable even when the page loads instantly
    const stop = () => {
      clearTimeout(timer); clearInterval(poll);
      const wait = Math.max(0, 500 - (Date.now() - shownAt));
      timer = setTimeout(() => setBusy(false), wait);
    };
    const start = (watchUrl = true) => {
      startHref.current = location.href;
      setVi(document.cookie.includes("lang=vi"));
      setMode("page");
      setBusy(true);
      shownAt = Date.now();
      clearTimeout(timer); clearInterval(poll);
      timer = setTimeout(stop, 20000);
      // the new page has arrived once the address changes
      if (watchUrl) poll = setInterval(() => { if (location.href !== startHref.current) stop(); }, 150);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname.startsWith("/export") || /\.(csv|pdf)$/i.test(url.pathname)) {   // downloads
        e.preventDefault();
        download(url.toString(), a.getAttribute("download") || "");
        return;
      }
      if (url.pathname === location.pathname && url.search === location.search) return;   // same page / #anchor
      start();
    };
    /** Fetch the file ourselves so we can show "Preparing download…" until it is ready. */
    const download = async (href: string, fallbackName: string) => {
      setVi(document.cookie.includes("lang=vi"));
      setMode("download"); setBusy(true); shownAt = Date.now();
      clearTimeout(timer); clearInterval(poll);
      try {
        const res = await fetch(href, { credentials: "same-origin" });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const cd = res.headers.get("Content-Disposition") ?? "";
        const name = /filename="?([^";]+)"?/.exec(cd)?.[1] || fallbackName || href.split("/").pop()?.split("?")[0] || "download.csv";
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 10000);
        stop();
      } catch {
        setMode("failed");
        shownAt = Date.now() + 3500; // keep the error up for about 4 seconds
        stop();
      }
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (form.dataset.noLoading !== undefined) return;
      start();
    };
    const onStart = () => start(false);
    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    window.addEventListener("reloop:loading", onStart);
    window.addEventListener("reloop:loaded", stop);
    return () => {
      stop();
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("reloop:loading", onStart);
      window.removeEventListener("reloop:loaded", stop);
    };
  }, []);

  if (!busy) return null;
  return (
    <div role="status" aria-live="polite"
      style={{ position: "fixed", top: 16, right: 16, zIndex: 2000 }}
      className="flex items-center gap-2 rounded-[9px] border border-[#174538]/20 bg-white px-4 py-2 text-sm font-medium text-[#174538] shadow-lg">
      {mode !== "failed" && <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#174538]/25 border-t-[#174538]" />}
      {mode === "download" ? (vi ? "Đang chuẩn bị tệp tải xuống…" : "Preparing download…")
        : mode === "failed" ? (vi ? "Tải xuống thất bại. Vui lòng thử lại." : "Download failed. Please try again.")
        : (vi ? "Đang tải…" : "Loading…")}
    </div>
  );
}
