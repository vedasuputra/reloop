"use client";
import { useEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * A GET form that opens its address without reloading the browser page (a reload flashes white): on submit, the form's
 * values go into the address, empty ones are left out, and the page number goes back to 1.
 */
export default function SoftForm({ action, className, children }: { action: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    window.dispatchEvent(new Event(pending ? "reloop:loading" : "reloop:loaded"));
  }, [pending]);

  return (
    <form action={action} className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams(new FormData(e.currentTarget) as unknown as Record<string, string>);
        params.delete("page");
        for (const [k, v] of [...params]) if (v === "") params.delete(k);
        startTransition(() => router.push(`${action}?${params}`));
      }}>
      {children}
    </form>
  );
}
