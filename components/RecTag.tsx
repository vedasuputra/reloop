/** Recommendation label: REUSABLE mint #DEF4EE, REVIEW lime, SINGLE-USE cream. Text always says the label (never color alone). */
const STYLE: Record<string, string> = {
  REUSABLE: "bg-[#DEF4EE] text-[#174538] border-[#b7dccf]",
  REVIEW: "bg-[#F5FBE2] text-[#174538] border-[#d4e3a9]",
  "SINGLE-USE": "bg-[#FFFDD0] text-[#174538] border-[#174538]/40",
};

export default function RecTag({ rec, size = "sm" }: { rec: string; size?: "sm" | "lg" }) {
  const pad = size === "lg" ? "px-3 py-1 text-base" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-block whitespace-nowrap rounded-[6px] border font-semibold tracking-wide ${pad} ${STYLE[rec] ?? STYLE["SINGLE-USE"]}`}>
      {rec}
    </span>
  );
}
