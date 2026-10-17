"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * A search box that filters as you type: about a third of a second after the last key, it opens the same address with
 * the form's current values (no Enter, no page reload). Lives inside a GET form so the other filters travel along.
 */
export default function LiveSearch({ name, label, placeholder, defaultValue }: { name: string; label: string; placeholder: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    window.dispatchEvent(new Event(pending ? "reloop:loading" : "reloop:loaded"));
  }, [pending]);

  // Follow the address when it changes from somewhere else (for example "Clear filters"), but never while the user is typing
  useEffect(() => {
    if (document.activeElement !== input.current) setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const go = (form: HTMLFormElement) => {
    const params = new URLSearchParams(new FormData(form) as unknown as Record<string, string>);
    params.delete("page");
    for (const [k, v] of [...params]) if (v === "") params.delete(k);
    startTransition(() => router.push(`${form.getAttribute("action") ?? ""}?${params}`));
  };

  return (
    <label className="block min-w-[14rem] flex-[2] text-sm font-semibold">
      {label}
      <input ref={input} name={name} value={value} placeholder={placeholder} autoComplete="off"
        onChange={(e) => {
          setValue(e.target.value);
          const form = e.currentTarget.form;
          if (!form) return;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => go(form), 350);
        }}
        className="mt-1.5 h-10 w-full rounded-[9px] border border-[#174538]/25 bg-white px-3 py-2 text-sm font-normal text-[#174538] outline-none transition-colors placeholder:text-[#355E3B]/60 focus:border-[#174538]" />
    </label>
  );
}
