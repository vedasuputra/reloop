import type { ReactNode } from "react";

/**
 * Tiny, safe markdown renderer for assistant answers (no HTML injection):
 * paragraphs, line breaks, - / * bullet lists, 1. numbered lists, **bold**, *italic*, `code`.
 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${i++}`;
    if (tok.startsWith("**") || tok.startsWith("__")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k} className="rounded bg-black/5 px-1 font-[inherit]">{tok.slice(1, -1)}</code>);
    else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block = { kind: "p" | "ul" | "ol" | "h"; lines: string[] };

/** Split text into paragraphs, headings and lists; a list can follow a sentence without a blank line. */
function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r/g, "").trim().split("\n")) {
    const line = raw.trimEnd();
    const kind: Block["kind"] | "blank" =
      line.trim() === "" ? "blank" : /^\s*[-*•]\s+/.test(line) ? "ul" : /^\s*\d+[.)]\s+/.test(line) ? "ol" : /^#{1,6}\s+/.test(line) ? "h" : "p";
    if (kind === "blank") { blocks.push({ kind: "p", lines: [] }); continue; }
    const text = line.replace(/^\s*[-*•]\s+|^\s*\d+[.)]\s+|^#{1,6}\s+/, "");
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind && kind !== "h" && last.lines.length) last.lines.push(text);
    else blocks.push({ kind, lines: [text] });
  }
  return blocks.filter((b) => b.lines.length);
}

export default function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {parse(text).map((b, n) => {
        if (b.kind === "ul") return <ul key={n} className="list-disc space-y-1 pl-5">{b.lines.map((l, i) => <li key={i}>{inline(l, `${n}-${i}`)}</li>)}</ul>;
        if (b.kind === "ol") return <ol key={n} className="list-decimal space-y-1 pl-5">{b.lines.map((l, i) => <li key={i}>{inline(l, `${n}-${i}`)}</li>)}</ol>;
        return (
          <p key={n} className={b.kind === "h" ? "font-semibold" : undefined}>
            {b.lines.map((l, i) => <span key={i}>{i > 0 && <br />}{inline(l, `${n}-${i}`)}</span>)}
          </p>
        );
      })}
    </div>
  );
}
