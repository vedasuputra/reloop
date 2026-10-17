export type StatVariant = "cream" | "green" | "mint" | "lime" | "butter";

const GREEN = "bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEF6]";
// Stand-alone card: its own border and rounded corners
const BOX: Record<StatVariant, string> = {
  cream: "border border-[#174538]/15 bg-white",
  green: GREEN,
  mint: "border border-[#b7dccf] bg-[#DEF4EE]",
  lime: "border border-[#d4e3a9] bg-[#F5FBE2]",
  butter: "border border-[#174538]/25 bg-[#FFFDD0]",
};
// Cell inside a shared container (the container draws the border and the thin lines between cells)
const CELL: Record<StatVariant, string> = {
  cream: "bg-white", green: GREEN, mint: "bg-[#DEF4EE]", lime: "bg-[#F5FBE2]", butter: "bg-[#FFFDD0]",
};
const NUM = { sm: "text-xl", md: "text-3xl", lg: "text-5xl" };

/**
 * Summary card: small label, big number, optional note. `green` is the hero card; mint/lime/butter match the recommendation tags.
 * layout "card" (default): stands alone, the number sits at the very bottom. layout "cell": one of several cells inside a
 * shared container, the number sits right under the label.
 */
export default function Stat({ label, value, note, variant = "cream", size = "md", dot, layout = "card" }: {
  label: string; value: string; note?: string; variant?: StatVariant; size?: keyof typeof NUM;
  dot?: string; // color of a small circle shown before the label (the recommendation colors)
  layout?: "card" | "cell";
}) {
  const muted = variant === "green" ? "opacity-80" : "text-[#355E3B]";
  const cell = layout === "cell";
  return (
    <div className={`flex flex-col p-5 ${cell ? `min-h-[7.5rem] ${CELL[variant]}` : `min-h-[9.5rem] rounded-[9px] ${BOX[variant]}`}`}>
      <p className={`text-sm leading-5 ${muted} ${dot ? "flex items-start gap-2" : ""}`}>
        {dot && <span aria-hidden className="mt-[5px] inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot, boxShadow: "inset 0 0 0 1px rgba(23,69,56,0.25)" }} />}
        {label}
      </p>
      <div className={cell ? "mt-3" : "mt-auto pt-3"}>
        <p className={`font-medium leading-tight tracking-tight ${NUM[size]}`}>{value}</p>
        {note && <p className={`mt-1.5 text-xs leading-relaxed ${muted}`}>{note}</p>}
      </div>
    </div>
  );
}
