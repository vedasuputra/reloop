import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Inter, EB_Garamond } from "next/font/google";
import LangSwitch from "@/components/LangSwitch";
import RecTag from "@/components/RecTag";
import { createClient } from "@/lib/supabase/server";
import { baseConfig, model, DEFAULT_PRESET } from "@/lib/data";
import { scoreOrder, withPreset, settingsFromConfig } from "@/lib/rvs";
import { LANDING_EXAMPLE } from "@/lib/example";
import AssistantWidget from "@/components/AssistantWidget";
import LoginModal, { LoginTrigger } from "@/components/LoginModal";
import SmoothLink from "@/components/SmoothLink";
import { getT, type T, type Fmt } from "@/lib/i18n";
import { TARGETS } from "@/lib/targets";
import { TIERS, contactHref } from "@/lib/subscription";

/**
 * Public landing page (no login needed). Promotes the product and states the one flow.
 * The example order and the cost comparison are computed live with the same engine as the app.
 * Simulator results come from the team's execution plan (simulated orders, not pilot results).
 *
 * Design: white page #FFFFFF, cream #FFFEF6 for boxes, deep green #174538 (blocks #2F594F), hunter #355E3B for secondary text;
 * cream background, deep green text and blocks, EB Garamond titles, Inter body, 9px corners.
 */
const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-body" });
const display = EB_Garamond({ subsets: ["latin", "vietnamese"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-display" });


const EXAMPLE = LANDING_EXAMPLE;

const H = "font-[family-name:var(--font-display)] font-normal tracking-tight";
/** Numbers always use the body font, however big they are; the serif is for headings only. */
const NUM = "font-medium tracking-tight";
const BTN = "inline-block rounded-[9px] px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85";

export default function Landing() {
  return (
    <div className={`${body.variable} ${display.variable} min-h-screen w-full bg-white font-[family-name:var(--font-body)] text-[#174538]`}>
      {/* Load animation: content rises and fades in; switched off for people who prefer less motion */}
      <style>{`
        @keyframes rl-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .rl-rise { animation: rl-rise 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        .rl-delay { animation-delay: 0.18s; }
        @media (prefers-reduced-motion: reduce) { .rl-rise { animation: none; } }
      `}</style>
      <Suspense fallback={<p className="p-6">…</p>}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await connection();
  const { lang, t, f } = await getT();
  const { data: { user } } = await (await createClient()).auth.getUser();

  // Live numbers from the engine (reference brand: apparel-size mailer)
  const cfg = withPreset(baseConfig, DEFAULT_PRESET);
  const drop = scoreOrder(cfg, model, EXAMPLE, "dropoff");
  const courier = scoreOrder(cfg, model, EXAMPLE, "courier_pickup");
  const perUse = cfg.packaging.reusable_pack_vnd.value / cfg.packaging.reuse_cycles.value + cfg.packaging.cleaning_per_reuse_vnd.value;
  const pickup = cfg.logistics.ghn_tariff_vnd.value.noi_tinh * cfg.logistics.pickup_order_share.value;
  const w = settingsFromConfig(cfg).weights;
  const metrics = (model as { metrics?: { auc_model?: number; auc_baseline_category_mean?: number } }).metrics ?? {};

  const cta = user ? "/dashboard" : "/login";
  const ctaLabel = user ? t("Open the app", "Mở ứng dụng") : t("Get started", "Bắt đầu");

  const steps: [string, string][] = [
    [t("Upload orders", "Tải đơn hàng lên"), t("CSV export from any system, or our API. No integration needed to start.", "Xuất CSV từ bất kỳ hệ thống nào, hoặc dùng API. Không cần tích hợp để bắt đầu.")],
    [t("AI predicts the return", "AI dự đoán hoàn hàng"), t("A model trained on order history scores each order's chance of being returned.", "Mô hình học từ lịch sử đơn hàng chấm xác suất hoàn hàng của từng đơn.")],
    [t("RVS decides the pack", "RVS chọn bao bì"), t(`Reuse Viability Score = ${f.pct(w.cost)} cost advantage + ${f.pct(w.pack_return)} pack-return chance + ${f.pct(w.cycles)} reuse cycles.`,
      `Điểm khả thi tái sử dụng = ${f.pct(w.cost)} lợi thế chi phí + ${f.pct(w.pack_return)} khả năng bao bì quay về + ${f.pct(w.cycles)} số vòng tái sử dụng.`)],
    [t("Packers get the list", "Đội đóng gói nhận danh sách"), t("Download the REUSABLE list as CSV, one instruction per order. A guardrail never recommends reusable when it costs more.",
      "Tải danh sách REUSABLE dạng CSV, mỗi đơn một chỉ dẫn. Cơ chế bảo vệ không bao giờ đề xuất tái sử dụng khi nó đắt hơn.")],
  ];
  const features: [string, string][] = [
    [t("Dashboard & pilot targets", "Tổng quan & mục tiêu thí điểm"), t("Recommendations, cost vs all single-use, packs avoided, and progress against the pilot targets.", "Đề xuất, chi phí so với toàn bộ dùng một lần, bao bì được tránh và tiến độ so với mục tiêu thí điểm.")],
    [t("AI prediction you can explain", "Dự đoán AI có thể giải thích"), t("Every order shows which factors raised or lowered its return probability.", "Mỗi đơn cho thấy yếu tố nào làm tăng hoặc giảm xác suất hoàn hàng.")],
    [t("Score a new order", "Chấm điểm đơn mới"), t("Type in a single order and get the prediction, score and recommendation instantly.", "Nhập một đơn hàng và nhận ngay dự đoán, điểm và đề xuất.")],
    [t("Scenario simulator", "Mô phỏng kịch bản"), t("Compare 10–40% reusable: cost, packs avoided and bags lost, RVS vs random selection.", "So sánh 10–40% tái sử dụng: chi phí, bao bì được tránh và túi bị mất, RVS so với chọn ngẫu nhiên.")],
    [t("Your own costs", "Chi phí của riêng bạn"), t("Brand presets or your own pack prices, courier tariffs and return channel.", "Mẫu theo loại thương hiệu hoặc giá bao bì, cước vận chuyển và kênh thu hồi của riêng bạn.")],
    [t("Custom AI model", "Mô hình AI riêng"), t("Retrain the return model on your own history in one click, with fairness by group and wrong cases shown.", "Huấn luyện lại mô hình bằng lịch sử của bạn chỉ với một cú nhấp, kèm đánh giá công bằng theo nhóm và các trường hợp sai.")],
    [t("Sustainability & EPR report", "Báo cáo bền vững & EPR"), t("Monthly packs and plastic avoided, net of lost bags, ready to print.", "Bao bì và nhựa được tránh theo tháng, đã trừ túi bị mất, sẵn sàng để in.")],
    [t("AI assistant", "Trợ lý AI"), t("Ask why an order got its recommendation. Answers only from ReLoop's numbers, with an automatic number check.", "Hỏi vì sao một đơn nhận đề xuất đó. Chỉ trả lời từ số liệu của ReLoop, có kiểm tra số tự động.")],
    [t("API & CSV", "API & CSV"), t("Plug into an order system through the API, or work with CSV files as plan B.", "Kết nối hệ thống đơn hàng qua API, hoặc dùng tệp CSV làm phương án dự phòng.")],
  ];

  return (
    <>
      {/* Header: white bar */}
      <div className="border-b border-[#174538]/15 bg-white text-[#174538]">
        <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-lg font-semibold uppercase tracking-[0.12em]">ReLoop AI</Link>
          <nav className="hidden gap-6 text-sm md:flex">
            <SmoothLink href="#how" className="hover:underline">{t("Workflow", "Quy trình")}</SmoothLink>
            <SmoothLink href="#features" className="hover:underline">{t("Features", "Tính năng")}</SmoothLink>
            <SmoothLink href="#results" className="hover:underline">{t("Results", "Kết quả")}</SmoothLink>
            <SmoothLink href="#pricing" className="hover:underline">{t("Pricing", "Bảng giá")}</SmoothLink>
            <SmoothLink href="#team" className="hover:underline">{t("Team", "Đội ngũ")}</SmoothLink>
          </nav>
          <div className="flex items-center gap-3">
            <LangSwitch lang={lang} size="lg" />
            <Cta href={cta} signedIn={!!user} className={`${BTN} bg-[#174538] text-[#FFFEF6]`}>
              {user ? t("Open app", "Mở ứng dụng") : t("Log in", "Đăng nhập")}
            </Cta>
          </div>
        </header>
      </div>

      {/* Hero: fills the screen below the menu, text on top, live example below */}
      <section className="bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEF6]">
        <div className="mx-auto flex min-h-[calc(100svh-73px)] max-w-4xl flex-col items-center justify-center gap-12 px-6 py-16 text-center">
          <div className="rl-rise">
            <h1 className={`${H} text-5xl leading-[1.05] md:text-7xl`}>
              {t("Predict the return.", "Dự đoán hoàn hàng.")}<br />
              <em className="italic">{t("Choose the right package.", "Chọn đúng bao bì.")}</em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed opacity-90">
              {t("ReLoop AI decides, order by order, whether a reusable pack or a single-use pack makes sense so fashion brands cut single-use packaging without paying more for it. We sell decisions, not packaging.",
                 "ReLoop AI quyết định cho từng đơn hàng nên dùng bao bì tái sử dụng hay dùng một lần giúp thương hiệu thời trang giảm bao bì dùng một lần mà không tốn thêm chi phí. Chúng tôi bán quyết định, không bán bao bì.")}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Cta href={cta} signedIn={!!user} className={`${BTN} bg-white text-[#174538]`}>{ctaLabel} →</Cta>
              <SmoothLink href="#how" className={`${BTN} border border-[#FFFEF6]/70`}>{t("See how it works", "Xem cách hoạt động")}</SmoothLink>
            </div>
          </div>

          {/* Live example: same order, two return channels */}
          <div className="rl-rise rl-delay grid w-full overflow-hidden rounded-[9px] bg-white text-left text-[#174538] md:grid-cols-[1fr_1.3fr] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]">
              {/* Left column: the order, with the return probability as a band along the bottom */}
              <div className="flex flex-col">
                <div className="flex-1 p-6">
                <p className="mb-4 text-sm font-semibold text-[#355E3B]">{t("Live example", "Ví dụ trực tiếp")}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
                  {[
                    [t("Product type", "Loại sản phẩm"), t("Dress", "Váy")],
                    [t("Payment", "Thanh toán"), "COD"],
                    [t("Items", "Số sản phẩm"), t("2, same item in 2 sizes", "2, cùng sản phẩm 2 cỡ")],
                    [t("Voucher", "Voucher"), t("Used", "Có dùng")],
                    [t("Customer", "Khách hàng"), t("Returning, 33% past returns", "Khách quay lại, đã hoàn 33%")],
                    [t("Distance", "Khoảng cách"), "12 km"],
                  ].map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-[#355E3B]">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[#174538]/15 bg-[#FFFEF6] px-6 py-3.5">
                  <p className="font-medium">{t("Return probability", "Xác suất hoàn hàng")}</p>
                  <p className="text-xl font-bold leading-none">{f.pct(drop.predReturnProb)}</p>
                </div>
              </div>
              {/* Right column: the two answers; the divider runs the full height of the box */}
              <div className="border-t border-[#174538]/15 p-6 md:border-l md:border-t-0">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard t={t} f={f} title={t("Pack comes back by drop-off", "Khách tự gửi trả bao bì")} r={drop} />
                  <ResultCard t={t} f={f} title={t("Courier picks up the pack", "Shipper đến lấy bao bì")} r={courier} />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[#355E3B]">
                  {t("Same order, different answer: it all depends on how the pack comes back, so one policy for every order fails.",
                     "Cùng một đơn, kết quả khác nhau: tùy vào cách bao bì quay về, nên một chính sách chung cho mọi đơn sẽ thất bại.")}
                </p>
              </div>
          </div>
        </div>
      </section>

      {/* Problem: cream block */}
      <section className="w-full border-y border-[#174538]/10 bg-[#FFFEF6]">
        <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <h2 className={`${H} text-4xl leading-tight`}>{t("Reusable isn't automatically better.", "Tái sử dụng không tự động tốt hơn.")}</h2>
            <p className="mt-4 leading-relaxed text-[#355E3B]">
              {t("Brands want less single-use packaging, but sending a courier back for every empty pack can cost more than the pack itself.",
                 "Thương hiệu muốn giảm bao bì dùng một lần, nhưng cho shipper quay lại lấy từng bao bì rỗng có thể tốn hơn chính bao bì đó.")}
            </p>
          </div>
          <TintStat value={f.vnd(pickup)} label={t("courier pickup of one empty pack (GHN tariff)", "phí shipper lấy một bao bì rỗng (cước GHN)")} />
          <TintStat value={f.vnd(perUse)} label={t(`per reuse of a reusable bag, incl. washing, about ${Math.round(pickup / perUse)}× less than one pickup`,
            `mỗi lần dùng lại túi tái sử dụng, gồm vệ sinh, rẻ hơn khoảng ${Math.round(pickup / perUse)} lần so với một lần lấy hàng`)} />
        </div>
        </div>
      </section>

      {/* One flow */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHead title={t("Orders to packing list in four steps", "Từ đơn hàng đến danh sách đóng gói")} />
        <ol className="mt-12 grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/20 bg-[#174538]/20 md:grid-cols-4">
          {steps.map(([title, text], i) => (
            <li key={title} className="bg-[#FFFEF6] p-6">
              <p className={`${NUM} text-5xl text-[#355E3B]`}>{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">{text}</p>
            </li>
          ))}
        </ol>
        {/* What each RVS band means */}
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            ["REUSABLE", "RVS ≥ 70", t("Ship in a reusable pack.", "Gửi bằng bao bì tái sử dụng."), "border border-[#b7dccf] bg-[#DEF4EE] text-[#174538]"],
            ["REVIEW", "RVS 40–69", t("Single-use by default; the team can switch it to reusable.", "Mặc định dùng một lần; đội vận hành có thể chuyển sang tái sử dụng."), "border border-[#d4e3a9] bg-[#F5FBE2] text-[#174538]"],
            ["SINGLE-USE", t("RVS below 40", "RVS dưới 40"), t("Ship in a single-use pack.", "Gửi bằng bao bì dùng một lần."), "border border-[#174538]/25 bg-[#FFFDD0] text-[#174538]"],
          ].map(([name, range, text, style]) => (
            <div key={name} className={`flex items-baseline justify-between gap-4 rounded-[9px] px-5 py-4 ${style}`}>
              <div>
                <p className="font-semibold tracking-wide">{name}</p>
                <p className="mt-1 text-sm opacity-85">{text}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold">{range}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-[#174538]/15">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionHead title={t("Everything in one place", "Tất cả trong một nơi")} />
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text]) => (
              <div key={title} className="border-t-2 border-[#174538] pt-4">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results: key stats in deep green */}
      <section id="results" className="mx-auto max-w-6xl px-6 pb-24">
        <SectionHead title={t("What the simulator shows", "Kết quả từ bộ mô phỏng")} />
        <p className="mt-3 text-sm text-[#355E3B]">
          {t("5,000 simulated orders, sourced Vietnamese costs, apparel-size mailer. Simulated data, not pilot results.",
             "5.000 đơn mô phỏng, chi phí có nguồn tại Việt Nam, túi gói hàng cỡ quần áo. Dữ liệu mô phỏng, không phải kết quả thí điểm.")}
        </p>
        <div className="mt-10 grid gap-3 md:grid-cols-4">
          <GreenStat value="25–74%" label={t("lower added cost than random selection when packs need courier pickup", "chi phí phát sinh thấp hơn so với chọn ngẫu nhiên khi cần shipper lấy bao bì")} />
          <GreenStat value={t("−231k VND", "−231 nghìn VND")} label={t("per 1,000 orders at 40% reusable with drop-off, about 25% of packaging cost", "trên 1.000 đơn ở mức 40% tái sử dụng khi khách tự gửi trả, khoảng 25% chi phí bao bì")} />
          <GreenStat value={t("~4,000", "~4.000")} label={t("single-use packs avoided per day at Coolmate's volume (~10,000 orders/day), illustrative", "bao bì dùng một lần được tránh mỗi ngày ở quy mô Coolmate (~10.000 đơn/ngày), minh họa")} />
          <GreenStat value={metrics.auc_model ? `${f.n(metrics.auc_model, 2)} vs ${f.n(metrics.auc_baseline_category_mean ?? 0, 2)}` : "-"}
            label={t("return model AUC vs a category-only baseline, on newer orders", "AUC của mô hình so với mốc chỉ theo danh mục, trên các đơn mới hơn")} />
        </div>
        <div className="mt-4 rounded-[9px] border border-[#174538]/25 bg-[#FFFEF6] p-5 text-sm leading-relaxed">
          <b>{t("Honest limits", "Giới hạn được nêu rõ")}: </b>
          <span className="text-[#355E3B]">
            {t("CO₂ is not estimated yet (no sourced emission factor). EPR credits are excluded. Lost reusable bags are counted as waste. The 50% drop-off return rate is an assumption the pilot will measure.",
               "CO₂ chưa được ước tính (chưa có hệ số phát thải có nguồn). Không tính tín chỉ EPR. Túi tái sử dụng bị mất được tính là rác thải. Tỷ lệ khách tự gửi trả 50% là giả định sẽ được đo trong thí điểm.")}
          </span>
        </div>
      </section>

      {/* Roadmap + targets: deep green block */}
      <GreenSection>
        <h2 className={`${H} text-4xl md:text-5xl`}>{t("A 12-month pilot with clear gates", "Thí điểm 12 tháng với các mốc rõ ràng")}</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            [t("M1–2", "T1–2"), t("Discover & govern", "Khảo sát & quản trị"), t("Agree data use, retention and access rules; map order, return, packaging and warehouse fields.", "Thống nhất quy tắc dùng, lưu giữ và truy cập dữ liệu; ánh xạ các trường đơn hàng, hoàn hàng, bao bì và kho.")],
            [t("M3–4", "T3–4"), t("Configure the B2B MVP", "Cấu hình MVP B2B"), t("Brand inputs (pack price, return method, warehouses, courier tariff); the simulator updates without AI retraining.", "Đầu vào của thương hiệu (giá bao bì, cách thu hồi, kho, cước vận chuyển); bộ mô phỏng cập nhật mà không cần huấn luyện lại AI.")],
            [t("M5–7", "T5–7"), t("One-brand pilot", "Thí điểm một thương hiệu"), t("Train on approved brand data in shadow mode: compare predictions with actual outcomes; measure recovery, loss, cleaning and total cost.", "Huấn luyện trên dữ liệu thương hiệu đã duyệt ở chế độ song song: so dự đoán với thực tế; đo thu hồi, thất lạc, vệ sinh và tổng chi phí.")],
            [t("M8–12", "T8–12"), t("Retrain & scale", "Huấn luyện lại & mở rộng"), t("Retrain on real outcomes, then add warehouses and brands, only if the gates are met.", "Huấn luyện lại trên kết quả thật, rồi mở rộng kho và thương hiệu, chỉ khi đạt các mốc.")],
          ].map(([m, title, text]) => (
            <div key={m} className="rounded-[9px] bg-[#FFFEF6]/10 p-6">
              <p className={`${NUM} text-3xl`}>{m}</p>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed opacity-85">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm font-semibold">{t("Targets by month 12", "Mục tiêu đến tháng 12")}</p>
        <div className="mt-3 grid gap-px overflow-hidden rounded-[9px] border border-[#FFFEF6]/25 bg-[#FFFEF6]/25 sm:grid-cols-2 md:grid-cols-4">
          {[
            [`AUC ≥ ${f.n(TARGETS.auc, 2)}`, t("return prediction on real orders", "dự đoán hoàn hàng trên đơn thật")],
            [f.pct(TARGETS.selfReturn), t("packs returned without a courier", "bao bì quay về không cần shipper")],
            [f.n(TARGETS.packsAvoidedPer1000), t("single-use packs avoided per 1,000 orders", "bao bì dùng một lần được tránh trên 1.000 đơn")],
            [`≥ ${f.pct(TARGETS.costSaving)}`, t("packaging cost saving vs all single-use", "tiết kiệm chi phí bao bì so với toàn bộ dùng một lần")],
          ].map(([v, l]) => (
            <div key={l} className="bg-[#2a5148] p-5">
              <p className={`${NUM} text-3xl`}>{v}</p>
              <p className="mt-1 text-sm opacity-85">{l}</p>
            </div>
          ))}
        </div>
      </GreenSection>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHead title={t("Simple SaaS pricing", "Bảng giá SaaS đơn giản")} />
        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {TIERS.map((tier, i) => {
            const featured = i === 1;
            return (
              <div key={tier.key} className={`flex flex-col rounded-[9px] border p-7 ${featured ? "border-[#264840] bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEF6]" : "border-[#174538]/25 bg-[#FFFEF6]"}`}>
                <h3 className="font-semibold">{tier.name}</h3>
                <p className={`${NUM} mt-3 text-5xl`}>{tier.priceM}M</p>
                <p className="mt-2 text-sm opacity-75">VND/{t("month", "tháng")}</p>
                <p className="mt-4 text-sm font-medium">{t(...tier.tagline)}</p>
                <ul className="mt-4 space-y-2.5 border-t border-current/15 pt-4 text-sm leading-relaxed">
                  {tier.benefits.map((b) => (
                    <li key={b[0]} className="flex gap-2.5">
                      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0 opacity-80"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
                      <span className="opacity-90">{t(...b)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-[#355E3B]">
          {t("Plus a one-time 15M VND integration fee. Add-ons: premium ESG/EPR reports, custom models, consulting. Planning prices, not signed contracts.",
             "Cộng phí tích hợp một lần 15 triệu VND. Dịch vụ thêm: báo cáo ESG/EPR nâng cao, mô hình riêng, tư vấn. Giá dự kiến, chưa phải hợp đồng đã ký.")}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[9px] border border-[#174538]/25 bg-white p-5">
          <p className="min-w-[16rem] max-w-2xl flex-1 text-balance text-sm leading-relaxed">
            <b className="font-semibold">{t("Plans are arranged by personal contact.", "Gói dịch vụ được thiết lập qua liên hệ trực tiếp.")}</b>{" "}
            {t("ReLoop AI is sold to organisations: once your organisation has subscribed, everyone with a company email can sign in.",
               "ReLoop AI được bán cho tổ chức: khi tổ chức của bạn đã đăng ký, mọi người dùng email công ty đều có thể đăng nhập.")}
          </p>
          <a href={contactHref("ReLoop AI subscription")} className={`${BTN} bg-[#174538] text-[#FFFEF6] sm:ml-auto`}>{t("Contact us", "Liên hệ")}</a>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="border-t border-[#174538]/15">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionHead title={t("The Loopies", "Đội Loopies")} />
          <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Diva Meilla Nisyah, B.M.", t("Business dev. & partnerships", "Phát triển kinh doanh & đối tác")],
              ["Permata Andini Sinaga, B.M.", t("Finance, impact & compliance", "Tài chính, tác động & tuân thủ")],
              ["Aisha Nasywa Emiliana, B.Eng.", t("Operations & recovery system", "Vận hành & hệ thống thu hồi")],
              ["I Ketut Veda Suputra, B.Cs.", t("AI, website, data & product", "AI, website, dữ liệu & sản phẩm")],
            ].map(([name, role]) => (
              <div key={name} className="border-t-2 border-[#174538] pt-4">
                <p className={`${H} text-xl`}>{name}</p>
                <p className="mt-1 text-sm text-[#355E3B]">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <GreenSection>
        <div className="py-8 text-center">
          <h2 className={`${H} text-4xl md:text-6xl`}><em className="italic">{t("The right package for every order.", "Đúng bao bì cho mọi đơn hàng.")}</em></h2>
          <p className="mx-auto mt-5 max-w-2xl opacity-85">
            {t("Open the working prototype: upload orders, see predictions, download the packing list.", "Mở bản mẫu đang chạy: tải đơn hàng lên, xem dự đoán, tải danh sách đóng gói.")}
          </p>
          <Cta href={cta} signedIn={!!user} className={`${BTN} mt-8 bg-white text-[#174538]`}>{ctaLabel} →</Cta>
        </div>
      </GreenSection>

      {/* Login popup: opened by the Log in / demo buttons, or by ?login=1 */}
      {!user && (
        <LoginModal fontClass={`${body.className} ${display.variable}`} copy={{
          title: t("Log in", "Đăng nhập"),
          password: t("Password", "Mật khẩu"),
          passwordHint: t("Min. 6 characters", "Tối thiểu 6 ký tự"),
          login: t("Log in", "Đăng nhập"),
          signup: t("Sign up", "Đăng ký"),
          close: t("Close", "Đóng"),
          demo: t("Use your company email, e.g. name@coolmate.me", "Dùng email công ty của bạn, ví dụ name@coolmate.me"),
          guideTitle: t("For judges and viewers", "Dành cho ban giám khảo và người xem"),
          guide: t(
            "Please register with an email address ending in @coolmate.me. The part before the @ is not checked; your own name is sufficient, for example yourname@coolmate.me.\nAs this is a prototype, the address is not verified and no email will be sent. Choose a password of at least 6 characters and select Sign up. On subsequent visits, select Log in.",
            "Vui lòng đăng ký bằng địa chỉ email có đuôi @coolmate.me. Phần trước dấu @ không được kiểm tra; quý vị chỉ cần dùng tên của mình, ví dụ tenban@coolmate.me.\nVì đây là bản mẫu nên địa chỉ email không được xác minh và sẽ không có email nào được gửi. Vui lòng đặt mật khẩu tối thiểu 6 ký tự và chọn Đăng ký. Từ lần truy cập sau, vui lòng chọn Đăng nhập."),
          note: t(
            "ReLoop AI is sold to organisations: only organisations that have subscribed can sign in. All demo orders are simulated.",
            "ReLoop AI được bán cho tổ chức: chỉ tổ chức đã đăng ký mới đăng nhập được. Toàn bộ đơn hàng demo là dữ liệu mô phỏng."),
        }} />
      )}

      {/* Ask AI: general questions for visitors; data questions after login */}
      <AssistantWidget org="" preset="" method="dropoff" lang={lang} variant="brand" fontClass={body.className} />

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 py-8 text-xs text-[#355E3B]">
        <p>ReLoop AI · UEH Business Challenge 2026 · {t("All demo data is simulated.", "Toàn bộ dữ liệu demo là dữ liệu mô phỏng.")}</p>
        <Link href="/privacy" className="underline">{t("Data & Privacy", "Dữ liệu & Quyền riêng tư")}</Link>
      </footer>
    </>
  );
}

/** Signed in: link to the app. Signed out: open the login popup. */
function Cta({ href, signedIn, className, children }: { href: string; signedIn: boolean; className: string; children: ReactNode }) {
  return signedIn ? <Link href={href} className={className}>{children}</Link> : <LoginTrigger className={className}>{children}</LoginTrigger>;
}

function SectionHead({ title }: { title: string }) {
  return <h2 className={`${H} max-w-4xl text-4xl leading-tight md:text-5xl`}>{title}</h2>;
}

/** Deep green block that runs from edge to edge of the screen. */
function GreenSection({ children }: { children: ReactNode }) {
  return (
    <section className="w-full bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEF6]">
      <div className="mx-auto max-w-6xl px-6 py-20">{children}</div>
    </section>
  );
}

function TintStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[9px] border border-[#174538]/15 bg-white p-6">
      <p className={`${NUM} text-4xl`}>{value}</p>
      <p className="mt-3 text-sm leading-relaxed text-[#355E3B]">{label}</p>
    </div>
  );
}

function GreenStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[9px] bg-gradient-to-b from-[#2F594F] to-[#264840] p-6 text-[#FFFEF6]">
      <p className={`${NUM} text-4xl`}>{value}</p>
      <p className="mt-3 text-sm leading-relaxed opacity-85">{label}</p>
    </div>
  );
}

function ResultCard({ t, f, title, r }: { t: T; f: Fmt; title: string; r: ReturnType<typeof scoreOrder> }) {
  const good = r.recommendation === "REUSABLE";
  return (
    <div className={`rounded-[9px] p-4 ${good ? "border border-[#b7dccf] bg-[#EEF9F6]" : "border border-[#174538]/30 bg-[#FFFEF6]"}`}>
      <p className="text-xs opacity-80">{title}</p>
      <div className="mt-3"><RecTag rec={r.recommendation} size="lg" /></div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {[
          ["RVS", f.n(r.rvs, 1)],
          [t("Reusable", "Tái sử dụng"), f.vnd(r.expCostReusableVnd)],
          [t("Single-use", "Dùng một lần"), f.vnd(r.expCostSingleVnd)],
        ].map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="opacity-75">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}