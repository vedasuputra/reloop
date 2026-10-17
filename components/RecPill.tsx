/** Recommendation label: a colored dot and the name, on the mint / lime / butter background used across the app. */
const STYLE: Record<string, { dot: string; box: string; name: string }> = {
  REUSABLE: { dot: "#2a7e67", box: "border-[#b7dccf] bg-[#DEF4EE]", name: "Reusable" },
  REVIEW: { dot: "#d6ef89", box: "border-[#d4e3a9] bg-[#F5FBE2]", name: "Review" },
  "SINGLE-USE": { dot: "#fffb9d", box: "border-[#174538]/25 bg-[#FFFDD0]", name: "Single-use" },
};

export default function RecPill({ rec, size = "sm" }: { rec: string; size?: "sm" | "lg" }) {
  const s = STYLE[rec] ?? STYLE["SINGLE-USE"];
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-[6px] border font-semibold text-[#174538] ${s.box} ${size === "lg" ? "px-3 py-1.5 text-base" : "px-2 py-0.5 text-xs"}`}>
      <span aria-hidden className={`inline-block rounded-full ${size === "lg" ? "h-3 w-3" : "h-2.5 w-2.5"}`} style={{ background: s.dot, boxShadow: "inset 0 0 0 1px rgba(23,69,56,0.25)" }} />
      {s.name}
    </span>
  );
}
