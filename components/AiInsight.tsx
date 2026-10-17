import { getT } from "@/lib/i18n";
import { buildInsight, dashboardSummary, type InsightInput } from "@/lib/insights";

const BOX = "rounded-[9px] border border-[#174538]/15 bg-white p-5";

function Sparkle() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="#37a486">
      <path d="M8 1.5c.4 3.1 1.9 4.6 5 5-3.1.4-4.6 1.9-5 5-.4-3.1-1.9-4.6-5-5 3.1-.4 4.6-1.9 5-5Z" />
      <path d="M12.8 10.6c.2 1.4.8 2 2.2 2.2-1.4.2-2 .8-2.2 2.2-.2-1.4-.8-2-2.2-2.2 1.4-.2 2-.8 2.2-2.2Z" opacity=".7" />
    </svg>
  );
}

/**
 * Two boxes under the filters, written by Ask AI: what the results are, and why. The text only reaches the screen
 * if every number in it appears in ReLoop's own facts, otherwise a rules-based text built from the same numbers is shown.
 * Rendered inside a Suspense boundary, so the rest of the dashboard never waits for the AI.
 */
export default async function AiInsight(props: Omit<InsightInput, "t" | "f">) {
  const { lang, t, f } = await getT();
  const data = buildInsight({ ...props, t, f });
  const { summary, why, source } = await dashboardSummary(data, lang);
  const ai = source === "ai";
  return (
    <section aria-label={t("AI summary", "Tóm tắt từ AI")}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className={BOX}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold"><Sparkle />{t("AI summary", "Tóm tắt từ AI")}</h2>
            <span className={`rounded-[6px] border px-2 py-0.5 text-xs font-semibold ${ai ? "border-[#b7dccf] bg-[#DEF4EE]" : "border-[#174538]/25 bg-[#FFFDD0]"}`}>
              {ai ? t("Numbers checked against ReLoop", "Số liệu đã đối chiếu với ReLoop") : t("Automatic summary", "Tóm tắt tự động")}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{summary}</p>
        </div>
        <div className={BOX}>
          <h2 className="flex items-center gap-2 font-semibold"><Sparkle />{t("Why this result?", "Vì sao có kết quả này?")}</h2>
          <p className="mt-3 text-sm leading-relaxed">{why}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-[#355E3B]/70">
        {ai
          ? t("Written by Ask AI from the numbers on this page. ReLoop calculates every number; the AI only explains them.",
              "Do Hỏi AI viết từ các số liệu trên trang này. ReLoop tính toán mọi con số; AI chỉ giải thích.")
          : t("The AI is not available right now, so these texts are built from the same numbers by ReLoop.",
              "AI hiện không khả dụng, nên các đoạn này được ReLoop tạo từ chính các số liệu đó.")}
      </p>
    </section>
  );
}

export function AiInsightSkeleton() {
  const line = (w: string) => <div key={w} className={`h-3 animate-pulse rounded-[2px] bg-[#174538]/10 ${w}`} />;
  return (
    <section aria-busy="true">
      <div className="grid gap-5 md:grid-cols-2">
        <div className={BOX}>
          <div className="flex items-center gap-2 font-semibold"><Sparkle />AI</div>
          <div className="mt-4 space-y-2.5">{["w-full", "w-11/12", "w-2/3"].map(line)}</div>
        </div>
        <div className={BOX}>
          <div className="flex items-center gap-2"><Sparkle /><div className="h-4 w-24 animate-pulse rounded-[2px] bg-[#174538]/10" /></div>
          <div className="mt-4 space-y-2.5">{["w-full", "w-10/12", "w-3/4"].map(line)}</div>
        </div>
      </div>
    </section>
  );
}
