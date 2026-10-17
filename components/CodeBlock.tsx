import CopyButton from "@/components/CopyButton";
import { GREEN } from "@/components/ui";

/** A code sample in the deep green of the sidebar, with a title bar and a copy button. */
export default function CodeBlock({ title, code, copy, copied }: { title: string; code: string; copy: string; copied: string }) {
  return (
    <div className={`overflow-hidden rounded-[9px] ${GREEN}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[#FFFEF6]/20 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</p>
        <CopyButton text={code} label={copy} done={copied} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">{code}</pre>
    </div>
  );
}
