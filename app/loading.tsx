/**
 * Next.js shows this instantly while the next page is being prepared on the server
 * (no click detection needed). Same look as the LoadingIndicator box, top-right.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite"
      style={{ position: "fixed", top: 16, right: 16, zIndex: 2000 }}
      className="flex items-center gap-2 rounded-[9px] border border-[#174538]/20 bg-white px-4 py-2 text-sm font-medium text-[#174538] shadow-lg">
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#174538]/25 border-t-[#174538]" />
      Loading…
    </div>
  );
}
