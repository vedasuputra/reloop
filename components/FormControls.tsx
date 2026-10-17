import type { ReactNode } from "react";
import { INPUT } from "@/components/ui";

/** Form pieces in the app style. Plain server components: they render ordinary inputs that work inside any <form>. */

function Chevron() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#174538]"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
  );
}

/** Label above, control in the middle, small hint below. `badge` sits at the right end of the label row. */
export function Field({ label, hint, badge, children, className = "" }: {
  label: string; hint?: ReactNode; badge?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <label className={`flex flex-col ${className}`}>
      <span className="flex items-center justify-between gap-3 text-sm font-semibold">
        <span>{label}</span>
        {badge}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1.5 text-xs leading-relaxed text-[#355E3B]">{hint}</span>}
    </label>
  );
}

/** A number input with an optional unit shown inside the box at the right ("VND", "%", "km"). */
export function NumberInput({ name, defaultValue, step = "1", min, max, suffix, required = true, placeholder }: {
  name: string; defaultValue?: number | string; step?: string; min?: number; max?: number; suffix?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="relative">
      <input name={name} type="number" step={step} min={min} max={max} defaultValue={defaultValue} required={required} placeholder={placeholder}
        className={`${INPUT} ${suffix ? "pr-14" : ""}`} />
      {suffix && <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#355E3B]">{suffix}</span>}
    </div>
  );
}

/** A native dropdown drawn with the app's look (used inside forms that submit with a button; the filter dropdowns use DescribedSelect). */
export function SelectInput({ name, defaultValue, options, required, placeholder }: {
  name: string; defaultValue?: string; options: { value: string; label: string }[]; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="relative">
      <select name={name} defaultValue={defaultValue ?? (placeholder ? "" : undefined)} required={required} className={`${INPUT} cursor-pointer appearance-none pr-9`}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Chevron />
    </div>
  );
}

/** A checkbox in a bordered row, so the whole row is easy to hit. */
export function CheckRow({ name, value = "1", defaultChecked, children }: { name: string; value?: string; defaultChecked?: boolean; children: ReactNode }) {
  return (
    <label className="flex h-10 cursor-pointer items-center gap-3 rounded-[9px] border border-[#174538]/25 bg-[#FFFEF6] px-3 text-sm transition-colors hover:border-[#174538]/60 has-[:checked]:border-[#174538] has-[:checked]:bg-white">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="h-4 w-4 shrink-0 cursor-pointer accent-[#174538]" />
      <span>{children}</span>
    </label>
  );
}
