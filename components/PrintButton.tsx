"use client";
import { BTN_OUTLINE } from "@/components/ui";

/** Opens the browser's print dialog (the sidebar and filters are hidden in print, so the page saves as a clean PDF). */
export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${BTN_OUTLINE} print:hidden`}>
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 6V2.5h7V6M4.5 11.5h-2v-5h11v5h-2M4.5 9.5h7v4h-7z" />
      </svg>
      {label}
    </button>
  );
}
