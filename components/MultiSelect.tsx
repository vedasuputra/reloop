"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type MultiOption = { value: string; label: string; count?: number };

/**
 * A dropdown where several options can be ticked, for filters inside a plain GET form. The ticked values travel in one
 * hidden field as a comma-separated list. Choosing "Apply" (or clicking outside) opens the same address with the form's
 * current values: client-side navigation, no page reload. Page is reset to 1.
 */
export default function MultiSelect({ name, label, options, selected, allLabel, selectedWord, clearLabel, applyLabel }: {
  name: string; label: string; options: MultiOption[]; selected: string[];
  allLabel: string; selectedWord: string; clearLabel: string; applyLabel: string;
}) {
  const [picked, setPicked] = useState<string[]>(selected);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const id = useId();

  // Same loading box as the other filters while the new list is prepared
  useEffect(() => {
    window.dispatchEvent(new Event(pending ? "reloop:loading" : "reloop:loaded"));
  }, [pending]);

  const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

  const apply = (next: string[]) => {
    setOpen(false);
    const form = field.current?.form;
    if (!form || !field.current || same(next, selected)) return;
    field.current.value = next.join(",");
    const params = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
    params.delete("page");
    startTransition(() => router.push(`${form.getAttribute("action") ?? ""}?${params}`));
  };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) apply(picked); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setPicked(selected); setOpen(false); } };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open, picked]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (v: string) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const summary = picked.length === 0 ? allLabel
    : picked.length <= 2 ? picked.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ")
    : `${picked.length} ${selectedWord}`;

  return (
    <div ref={box} className="relative">
      <input ref={field} type="hidden" name={name} defaultValue={selected.join(",")} />
      <p id={`${id}-label`} className="text-sm font-semibold">{label}</p>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-label`}
        onClick={() => setOpen((o) => !o)}
        className={`mt-1.5 flex w-full cursor-pointer items-center justify-between gap-3 rounded-[9px] border bg-[#FFFEF6] px-3 py-2 text-left text-sm text-[#174538] outline-none transition-colors hover:border-[#174538]/60 focus-visible:border-[#174538] ${open ? "border-[#174538]" : "border-[#174538]/25"}`}>
        <span className="truncate">{summary}</span>
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" aria-labelledby={`${id}-label`}
          className="absolute left-0 z-30 mt-1.5 w-full min-w-[15rem] overflow-hidden rounded-[9px] border border-[#174538]/20 bg-white shadow-[0_16px_40px_-16px_rgba(23,69,56,0.35)]">
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-[#FFFEF6]">
                <span className="flex min-w-0 items-center gap-2.5">
                  <input type="checkbox" checked={picked.includes(o.value)} onChange={() => toggle(o.value)} className="h-4 w-4 shrink-0 cursor-pointer accent-[#2a7e67]" />
                  <span className="truncate">{o.label}</span>
                </span>
                {o.count !== undefined && <span className="shrink-0 text-xs text-[#355E3B]">{o.count.toLocaleString("en-US")}</span>}
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[#174538]/10 bg-[#FFFEF6] px-3 py-2">
            <button type="button" onClick={() => setPicked([])} className="cursor-pointer text-xs font-semibold underline underline-offset-2">{clearLabel}</button>
            <button type="button" onClick={() => apply(picked)} className="cursor-pointer rounded-[6px] bg-[#174538] px-3 py-1 text-xs font-semibold text-[#FFFEF6] hover:opacity-85">{applyLabel}</button>
          </div>
        </div>
      )}
    </div>
  );
}
