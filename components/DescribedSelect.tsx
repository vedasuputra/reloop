"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type SelectOption = { value: string; label: string; description?: string; disabled?: boolean };

/**
 * A styled dropdown (instead of the browser's own list) where every option can carry a short explanation.
 * Works inside a plain GET form: it keeps a hidden field with the chosen value and, when you pick, opens the same address
 * with the form's current values (client-side navigation, no page reload).
 */
export default function DescribedSelect({ name, defaultValue, options, label, compact = false }: {
  name: string; defaultValue: string; options: SelectOption[]; label: string;
  compact?: boolean; // no explanation under the button (for tight places); each option still explains itself in the open list
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  // Move to the new filters without reloading the browser page (a reload flashes white), and show the Loading box meanwhile
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    window.dispatchEvent(new Event(pending ? "reloop:loading" : "reloop:loaded"));
  }, [pending]);

  const choose = (v: string) => {
    setOpen(false);
    if (v === value || options.find((o) => o.value === v)?.disabled) return;
    setValue(v);
    const form = field.current?.form;
    if (field.current && form) {
      field.current.value = v; // the form reads this field, so set it before collecting the values
      const params = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
      startTransition(() => router.push(`${form.getAttribute("action") ?? ""}?${params}`));
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setActive(options.findIndex((o) => o.value === value)); setOpen(true); return; }
      // the next option that can be chosen, skipping the greyed-out ones
      setActive((i) => {
        const dir = e.key === "ArrowDown" ? 1 : options.length - 1;
        for (let k = 1; k <= options.length; k++) {
          const j = (i + dir * k) % options.length;
          if (!options[j].disabled) return j;
        }
        return i;
      });
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      choose(options[active].value);
    }
  };

  return (
    <div ref={box} className="relative">
      <input ref={field} type="hidden" name={name} defaultValue={defaultValue} />
      <p id={`${id}-label`} className="text-sm font-semibold">{label}</p>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-label`} onKeyDown={onKey}
        onClick={() => { setActive(options.findIndex((o) => o.value === value)); setOpen((o) => !o); }}
        className={`mt-1.5 flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-[9px] border bg-[#FFFEF6] px-3 py-2 text-left text-sm text-[#174538] outline-none transition-colors hover:border-[#174538]/60 focus-visible:border-[#174538] ${open ? "border-[#174538]" : "border-[#174538]/25"}`}>
        <span className="truncate">{current.label}</span>
        <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}><path d="M2.5 4.5 6 8l3.5-3.5" /></svg>
      </button>
      {open && (
        <ul role="listbox" aria-labelledby={`${id}-label`}
          className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-[9px] border border-[#174538]/20 bg-white py-1 shadow-[0_16px_40px_-16px_rgba(23,69,56,0.35)]">
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value} aria-disabled={o.disabled || undefined}
              onMouseEnter={() => { if (!o.disabled) setActive(i); }} onClick={() => choose(o.value)}
              // chosen option: #FFFEEA; hovered / keyboard-selected option: #FFFEF6. Right padding keeps all text clear of the checkmark.
              className={`relative py-2.5 pl-3 pr-10 ${o.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"} ${o.value === value ? "bg-[#FFFEEA]" : i === active && !o.disabled ? "bg-[#FFFEF6]" : ""}`}>
              <span className={`text-sm ${o.value === value ? "font-semibold" : ""}`}>{o.label}</span>
              {o.value === value && (
                <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="absolute right-4 top-[15px]"><path d="M2.5 6.5 5 9l4.5-5.5" /></svg>
              )}
              {o.description && <p className="mt-0.5 text-xs leading-relaxed text-[#355E3B]">{o.description}</p>}
            </li>
          ))}
        </ul>
      )}
      {!compact && current.description && <p className="mt-1.5 text-xs leading-relaxed text-[#355E3B]">{current.description}</p>}
    </div>
  );
}
