"use client";
export default function PrintButton({ label }: { label: string }) {
  return <button onClick={() => window.print()} className="rounded border px-3 py-1 text-sm print:hidden">{label}</button>;
}
