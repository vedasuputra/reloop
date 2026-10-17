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
import SmoothLink from "@/components/SmoothLink";
import { getT, type T, type Fmt } from "@/lib/i18n";
import { TARGETS } from "@/lib/targets";

/**
 * Public landing page (no login needed). Promotes the product and states the one flow.
 * The example order and the cost comparison are computed live with the same engine as the app.
 * Simulator results come from the team's execution plan (simulated orders, not pilot results).
 *
 * Design: white page #FFFFFF, cream #FFFEEA for boxes, deep green #174538 (blocks #2F594F), hunter #355E3B for secondary text;
 * cream background, deep green text and blocks, EB Garamond titles, Inter body, 9px corners.
 */
const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-body" });
const display = EB_Garamond({ subsets: ["latin", "vietnamese"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-display" });


const EXAMPLE = LANDING_EXAMPLE;

const H = "font-[family-name:var(--font-display)] font-normal tracking-tight";
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
  const metrics = (model as any).metrics ?? {};

  const cta = user ? "/dashboard" : "/login";
  const ctaLabel = user ? t("Open the app", "Mở ứng dụng") : t("Try the live demo", "Dùng thử bản demo");

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
            <Link href={cta} className={`${BTN} bg-[#174538] text-[#FFFEEA]`}>
              {user ? t("Open app", "Mở ứng dụng") : t("Log in", "Đăng nhập")}
            </Link>
          </div>
        </header>
      </div>

      {/* Hero: fills the screen below the menu, text on top, live example below */}
      <section className="bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEEA]">
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
              <Link href={cta} className={`${BTN} bg-white text-[#174538]`}>{ctaLabel} →</Link>
              <SmoothLink href="#how" className={`${BTN} border border-[#FFFEEA]/70`}>{t("See how it works", "Xem cách hoạt động")}</SmoothLink>
            </div>
            {!user && (
              <p className="mt-5 text-sm opacity-85">
                {t("Demo account", "Tài khoản demo")}: <b>demo@reloop.app</b> / <b>reloop</b>
              </p>
            )}
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
                <div className="flex items-center justify-between gap-4 border-t border-[#174538]/15 bg-gradient-to-b from-[#FFFEF2] to-[#FFFEEA] px-6 py-3.5">
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
      <section className="w-full border-y border-[#174538]/10 bg-gradient-to-b from-[#FFFEF2] to-[#FFFEEA]">
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
          <TintStat value={f.vnd(perUse)} label={t(`per reuse of a reusable bag, incl. washing — about ${Math.round(pickup / perUse)}× less than one pickup`,
            `mỗi lần dùng lại túi tái sử dụng, gồm vệ sinh — rẻ hơn khoảng ${Math.round(pickup / perUse)} lần so với một lần lấy hàng`)} />
        </div>
        </div>
      </section>

      {/* One flow */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHead title={t("Orders to packing list in four steps", "Từ đơn hàng đến danh sách đóng gói")} />
        <ol className="mt-12 grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/20 bg-[#174538]/20 md:grid-cols-4">
          {steps.map(([title, text], i) => (
            <li key={title} className="bg-gradient-to-b from-[#FFFEF2] to-[#FFFEEA] p-6">
              <p className={`${H} text-5xl text-[#355E3B]`}>{String(i + 1).padStart(2, "0")}</p>
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
          <GreenStat value={t("−231k VND", "−231 nghìn VND")} label={t("per 1,000 orders at 40% reusable with drop-off — about 25% of packaging cost", "trên 1.000 đơn ở mức 40% tái sử dụng khi khách tự gửi trả — khoảng 25% chi phí bao bì")} />
          <GreenStat value={t("~4,000", "~4.000")} label={t("single-use packs avoided per day at Coolmate's volume (~10,000 orders/day), illustrative", "bao bì dùng một lần được tránh mỗi ngày ở quy mô Coolmate (~10.000 đơn/ngày), minh họa")} />
          <GreenStat value={metrics.auc_model ? `${f.n(metrics.auc_model, 2)} vs ${f.n(metrics.auc_baseline_category_mean, 2)}` : "-"}
            label={t("return model AUC vs a category-only baseline, on newer orders", "AUC của mô hình so với mốc chỉ theo danh mục, trên các đơn mới hơn")} />
        </div>
        <div className="mt-4 rounded-[9px] border border-[#174538]/25 bg-gradient-to-b from-[#FFFEF2] to-[#FFFEEA] p-5 text-sm leading-relaxed">
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
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {[
            ["M1–3", t("Historical-data pilot", "Thí điểm trên dữ liệu lịch sử"), t("Shadow mode: score the brand's past orders and compare with what really happened.", "Chế độ chạy song song: chấm điểm đơn cũ của thương hiệu và so với thực tế.")],
            ["M4–6", t("Live API + channel test", "API trực tiếp + thử kênh thu hồi"), t("Real orders, capped share, measure how many packs come back without a courier.", "Đơn thật, giới hạn tỷ lệ, đo số bao bì quay về không cần shipper.")],
            ["M7–12", t("Retrain & scale", "Huấn luyện lại & mở rộng"), t("Retrain on real outcomes, then add warehouses and brands — only if the gates are met.", "Huấn luyện lại trên kết quả thật, rồi mở rộng kho và thương hiệu — chỉ khi đạt các mốc.")],
          ].map(([m, title, text]) => (
            <div key={m} className="rounded-[9px] bg-[#FFFEEA]/10 p-6">
              <p className={`${H} text-3xl`}>{m}</p>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed opacity-85">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm font-semibold">{t("Targets by month 12", "Mục tiêu đến tháng 12")}</p>
        <div className="mt-3 grid gap-px overflow-hidden rounded-[9px] border border-[#FFFEEA]/25 bg-[#FFFEEA]/25 sm:grid-cols-2 md:grid-cols-4">
          {[
            [`AUC ≥ ${f.n(TARGETS.auc, 2)}`, t("return prediction on real orders", "dự đoán hoàn hàng trên đơn thật")],
            [f.pct(TARGETS.selfReturn), t("packs returned without a courier", "bao bì quay về không cần shipper")],
            [f.n(TARGETS.packsAvoidedPer1000), t("single-use packs avoided per 1,000 orders", "bao bì dùng một lần được tránh trên 1.000 đơn")],
            [`≥ ${f.pct(TARGETS.costSaving)}`, t("packaging cost saving vs all single-use", "tiết kiệm chi phí bao bì so với toàn bộ dùng một lần")],
          ].map(([v, l]) => (
            <div key={l} className="bg-[#2a5148] p-5">
              <p className={`${H} text-3xl`}>{v}</p>
              <p className="mt-1 text-sm opacity-85">{l}</p>
            </div>
          ))}
        </div>
      </GreenSection>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHead title={t("Simple SaaS pricing", "Bảng giá SaaS đơn giản")} />
        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {[
            ["Starter", "3M", t("One brand, CSV workflow, dashboard, simulator and report.", "Một thương hiệu, quy trình CSV, tổng quan, mô phỏng và báo cáo.")],
            ["Growth", "7M", t("API integration, custom AI model, multiple data sets.", "Tích hợp API, mô hình AI riêng, nhiều bộ dữ liệu.")],
            ["Enterprise", "15M", t("Multi-warehouse, scheduled retraining, priority support.", "Nhiều kho, huấn luyện lại định kỳ, hỗ trợ ưu tiên.")],
          ].map(([name, price, text], i) => {
            const featured = i === 1;
            return (
              <div key={name} className={`rounded-[9px] border p-7 ${featured ? "border-[#264840] bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEEA]" : "border-[#174538]/25 bg-gradient-to-b from-[#FFFEF2] to-[#FFFEEA]"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{name}</h3>
                </div>
                <p className={`${H} mt-6 text-5xl`}>{price}</p>
                <p className="text-sm opacity-75">VND / {t("month", "tháng")}</p>
                <p className="mt-6 text-sm leading-relaxed opacity-85">{text}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-[#355E3B]">
          {t("Plus a one-time 15M VND integration fee. Add-ons: premium ESG/EPR reports, custom models, consulting. Planning prices, not signed contracts.",
             "Cộng phí tích hợp một lần 15 triệu VND. Dịch vụ thêm: báo cáo ESG/EPR nâng cao, mô hình riêng, tư vấn. Giá dự kiến, chưa phải hợp đồng đã ký.")}
        </p>
      </section>

      {/* Team */}
      <section id="team" className="border-t border-[#174538]/15">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionHead title={t("The Loopies", "Đội Loopies")} />
          <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Diva Meilla Sinaga, B.M.", t("Business dev. & partnerships", "Phát triển kinh doanh & đối tác")],
              ["Permata Andini Nisyah, B.M.", t("Finance, impact & compliance", "Tài chính, tác động & tuân thủ")],
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
            {t("Open the working prototype: upload orders, see the predictions, download the packing list.", "Mở bản mẫu đang chạy: tải đơn hàng lên, xem dự đoán, tải danh sách đóng gói.")}
          </p>
          <Link href={cta} className={`${BTN} mt-8 bg-white text-[#174538]`}>{ctaLabel} →</Link>
        </div>
      </GreenSection>

      {/* Ask AI: general questions for visitors; data questions after login */}
      <AssistantWidget org="" preset="" method="dropoff" lang={lang} variant="brand" fontClass={body.className} />

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 py-8 text-xs text-[#355E3B]">
        <p>ReLoop AI · UEH Business Challenge 2026 · {t("All demo data is simulated.", "Toàn bộ dữ liệu demo là dữ liệu mô phỏng.")}</p>
        <Link href="/privacy" className="underline">{t("Data & Privacy", "Dữ liệu & Quyền riêng tư")}</Link>
      </footer>
    </>
  );
}

function SectionHead({ title }: { title: string }) {
  return <h2 className={`${H} max-w-4xl text-4xl leading-tight md:text-5xl`}>{title}</h2>;
}

/** Deep green block that runs from edge to edge of the screen. */
function GreenSection({ children }: { children: ReactNode }) {
  return (
    <section className="w-full bg-gradient-to-b from-[#2F594F] to-[#264840] text-[#FFFEEA]">
      <div className="mx-auto max-w-6xl px-6 py-20">{children}</div>
    </section>
  );
}

function TintStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[9px] border border-[#174538]/15 bg-white p-6">
      <p className={`${H} text-4xl`}>{value}</p>
      <p className="mt-3 text-sm leading-relaxed text-[#355E3B]">{label}</p>
    </div>
  );
}

function GreenStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[9px] bg-gradient-to-b from-[#2F594F] to-[#264840] p-6 text-[#FFFEEA]">
      <p className={`${H} text-4xl`}>{value}</p>
      <p className="mt-3 text-sm leading-relaxed opacity-85">{label}</p>
    </div>
  );
}

function ResultCard({ t, f, title, r }: { t: T; f: Fmt; title: string; r: ReturnType<typeof scoreOrder> }) {
  const good = r.recommendation === "REUSABLE";
  return (
    <div className={`rounded-[9px] p-4 ${good ? "border border-[#b7dccf] bg-[#EEF9F6]" : "border border-[#174538]/30 bg-gradient-to-b from-[#FFFEF2] to-[#FFFEEA]"}`}>
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