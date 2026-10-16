import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import LangSwitch from "@/components/LangSwitch";
import { createClient } from "@/lib/supabase/server";
import { baseConfig, model, DEFAULT_PRESET } from "@/lib/data";
import { scoreOrder, withPreset, settingsFromConfig, type Order } from "@/lib/rvs";
import { getT, type T, type Fmt } from "@/lib/i18n";
import { TARGETS } from "@/lib/targets";

/**
 * Public landing page (no login needed). Promotes the product and states the one flow.
 * The example order and the cost comparison are computed live with the same engine as the app.
 * Simulator results come from the team's execution plan (simulated orders, not pilot results).
 */

const EXAMPLE: Order = {
  category: "Dress", payment_method: "COD", multi_size: 1, voucher_used: 1, quantity_of_item: 2,
  past_delivered_in_data: 3, customer_return_rate_in_data: 0.33, estimated_delivery_distance_km: 12,
};

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Suspense fallback={<p>…</p>}>
        <Content />
      </Suspense>
    </main>
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

  return (
    <>
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          ReLoop AI
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm">
          <a href="#how" className="underline">{t("How it works", "Cách hoạt động")}</a>
          <a href="#features" className="underline">{t("Features", "Tính năng")}</a>
          <a href="#results" className="underline">{t("Results", "Kết quả")}</a>
          <a href="#pricing" className="underline">{t("Pricing", "Bảng giá")}</a>
          <a href="#team" className="underline">{t("Team", "Đội ngũ")}</a>
        </nav>
        <div className="flex items-center gap-3">
          <LangSwitch lang={lang} />
          <Link href={cta} className="rounded border px-3 py-1 text-sm">
            {user ? t("Open app", "Mở ứng dụng") : t("Log in", "Đăng nhập")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="grid items-center gap-10 py-6 md:grid-cols-2">
        <div>
          <p className="mb-4 inline-block rounded border px-3 py-1 text-xs">
            {t("AI decision intelligence for e-commerce packaging · Vietnam", "AI ra quyết định bao bì cho thương mại điện tử · Việt Nam")}
          </p>
          <h1 className="text-3xl font-bold">
            {t("Predict the return.", "Dự đoán hoàn hàng.")}<br />
            <span>{t("Choose the right package.", "Chọn đúng bao bì.")}</span>
          </h1>
          <p className="mt-3">
            {t("ReLoop AI decides, order by order, whether a reusable pack or a single-use pack makes sense — so fashion brands cut single-use packaging without paying more for it. We sell decisions, not packaging.",
               "ReLoop AI quyết định cho từng đơn hàng nên dùng bao bì tái sử dụng hay dùng một lần — giúp thương hiệu thời trang giảm bao bì dùng một lần mà không tốn thêm chi phí. Chúng tôi bán quyết định, không bán bao bì.")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={cta} className="rounded border px-3 py-1 font-semibold">{ctaLabel} →</Link>
            <a href="#how" className="rounded border px-3 py-1">{t("See how it works", "Xem cách hoạt động")}</a>
          </div>
          {!user && (
            <p className="mt-4 text-sm">
              {t("Demo account", "Tài khoản demo")}: <b >demo@reloop.app</b> / <b >reloop</b>
            </p>
          )}
        </div>

        {/* Live example: same order, two return channels */}
        <div className="rounded border p-3">
          <p className="text-xs text-gray-500">{t("Live example · computed by the ReLoop engine", "Ví dụ trực tiếp · tính bởi ReLoop")}</p>
          <p className="mt-2 text-sm text-gray-500">
            {t("Dress · COD · bought in 2 sizes · voucher · returning customer (33% past returns) · 12 km",
               "Váy · COD · mua 2 cỡ · dùng voucher · khách quay lại (đã hoàn 33%) · 12 km")}
          </p>
          <p className="mt-3 text-2xl font-bold">{t("Return probability", "Xác suất hoàn hàng")} <span>{f.pct(drop.predReturnProb)}</span></p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ResultCard t={t} f={f} title={t("Pack comes back by drop-off", "Khách tự gửi trả bao bì")} r={drop} />
            <ResultCard t={t} f={f} title={t("Courier picks up the empty pack", "Shipper đến lấy bao bì rỗng")} r={courier} />
          </div>
          <p className="mt-4 text-xs">
            {t("Same order, different answer: whether reusable pays depends on how the pack comes back. That is why one policy for all orders fails.",
               "Cùng một đơn, kết quả khác nhau: bao bì tái sử dụng có lợi hay không phụ thuộc vào cách bao bì quay về. Vì vậy một chính sách chung cho mọi đơn sẽ thất bại.")}
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="border-t">
        <div className="mx-auto grid max-w-6xl gap-6 py-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <h2 className="text-2xl font-bold">{t("Reusable isn't automatically better.", "Tái sử dụng không tự động tốt hơn.")}</h2>
            <p className="mt-3">
              {t("Brands want less single-use packaging, but sending a courier back for every empty pack can cost more than the pack itself.",
                 "Thương hiệu muốn giảm bao bì dùng một lần, nhưng cho shipper quay lại lấy từng bao bì rỗng có thể tốn hơn chính bao bì đó.")}
            </p>
          </div>
          <BigStat value={f.vnd(pickup)} label={t("courier pickup of one empty pack (GHN tariff)", "phí shipper lấy một bao bì rỗng (cước GHN)")} />
          <BigStat value={f.vnd(perUse)} label={t(`per reuse of a reusable bag, incl. washing — about ${Math.round(pickup / perUse)}× less than one pickup`,
            `mỗi lần dùng lại túi tái sử dụng, gồm vệ sinh — rẻ hơn khoảng ${Math.round(pickup / perUse)} lần so với một lần lấy hàng`)} />
        </div>
      </section>

      {/* One flow */}
      <section id="how" className="py-8">
        <p className="text-sm">{t("The one flow", "Một quy trình duy nhất")}</p>
        <h2 className="mt-2 text-2xl font-bold">{t("From today's orders to the packing list in four steps", "Từ đơn hàng hôm nay đến danh sách đóng gói trong bốn bước")}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            [t("Upload orders", "Tải đơn hàng lên"), t("CSV export from any system, or our API. No integration needed to start.", "Xuất CSV từ bất kỳ hệ thống nào, hoặc dùng API. Không cần tích hợp để bắt đầu.")],
            [t("AI predicts the return", "AI dự đoán hoàn hàng"), t("A model trained on order history scores each order's chance of being returned.", "Mô hình học từ lịch sử đơn hàng chấm xác suất hoàn hàng của từng đơn.")],
            [t("RVS decides the pack", "RVS chọn bao bì"), t(`Reuse Viability Score = ${f.pct(w.cost)} cost advantage + ${f.pct(w.pack_return)} pack-return chance + ${f.pct(w.cycles)} reuse cycles. ≥70 REUSABLE, 40–69 REVIEW, <40 SINGLE-USE.`,
              `Điểm khả thi tái sử dụng = ${f.pct(w.cost)} lợi thế chi phí + ${f.pct(w.pack_return)} khả năng bao bì quay về + ${f.pct(w.cycles)} số vòng tái sử dụng. ≥70 REUSABLE, 40–69 REVIEW, <40 SINGLE-USE.`)],
            [t("Packers get the list", "Đội đóng gói nhận danh sách")],
          ].map(([title, body], i) => (
            <div key={title} className="rounded border p-3">
              <span className="font-bold">{i + 1}.</span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-gray-500">{body ?? t("Download the REUSABLE list as CSV, one instruction per order. A guardrail never recommends reusable when it costs more.",
                "Tải danh sách REUSABLE dạng CSV, mỗi đơn một chỉ dẫn. Cơ chế bảo vệ không bao giờ đề xuất tái sử dụng khi nó đắt hơn.")}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features">
        <div className="py-8">
          <h2 className="text-2xl font-bold">{t("Everything in one platform", "Tất cả trong một nền tảng")}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [t("Dashboard & pilot targets", "Tổng quan & mục tiêu thí điểm"), t("Recommendations, cost vs all single-use, packs avoided, and progress against the pilot targets.", "Đề xuất, chi phí so với toàn bộ dùng một lần, bao bì được tránh và tiến độ so với mục tiêu thí điểm.")],
              [t("AI prediction you can explain", "Dự đoán AI có thể giải thích"), t("Every order shows which factors raised or lowered its return probability.", "Mỗi đơn cho thấy yếu tố nào làm tăng hoặc giảm xác suất hoàn hàng.")],
              [t("Score a new order", "Chấm điểm đơn mới"), t("Type in a single order and get the prediction, score and recommendation instantly.", "Nhập một đơn hàng và nhận ngay dự đoán, điểm và đề xuất.")],
              [t("Scenario simulator", "Mô phỏng kịch bản"), t("Compare 10–40% reusable: cost, packs avoided and bags lost, RVS vs random selection.", "So sánh 10–40% tái sử dụng: chi phí, bao bì được tránh và túi bị mất, RVS so với chọn ngẫu nhiên.")],
              [t("Your own costs", "Chi phí của riêng bạn"), t("Brand presets or your own pack prices, courier tariffs and return channel.", "Mẫu theo loại thương hiệu hoặc giá bao bì, cước vận chuyển và kênh thu hồi của riêng bạn.")],
              [t("Custom AI model", "Mô hình AI riêng"), t("Retrain the return model on your own history in one click, with fairness by group and wrong cases shown.", "Huấn luyện lại mô hình bằng lịch sử của bạn chỉ với một cú nhấp, kèm đánh giá công bằng theo nhóm và các trường hợp sai.")],
              [t("Sustainability & EPR report", "Báo cáo bền vững & EPR"), t("Monthly packs and plastic avoided, net of lost bags, ready to print.", "Bao bì và nhựa được tránh theo tháng, đã trừ túi bị mất, sẵn sàng để in.")],
              [t("AI assistant", "Trợ lý AI"), t("Ask why an order got its recommendation. Answers only from ReLoop's numbers, with an automatic number check.", "Hỏi vì sao một đơn nhận đề xuất đó. Chỉ trả lời từ số liệu của ReLoop, có kiểm tra số tự động.")],
              [t("API & CSV", "API & CSV"), t("Plug into an order system through the API, or work with CSV files as plan B.", "Kết nối hệ thống đơn hàng qua API, hoặc dùng tệp CSV làm phương án dự phòng.")],
            ].map(([title, body]) => (
              <div key={title} className="rounded border p-3">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-gray-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section id="results" className="py-8">
        <h2 className="text-2xl font-bold">{t("What the simulator shows", "Kết quả từ bộ mô phỏng")}</h2>
        <p className="mt-2 text-sm text-gray-500">
          {t("5,000 simulated orders, sourced Vietnamese costs, apparel-size mailer. Simulated data, not pilot results.",
             "5.000 đơn mô phỏng, chi phí có nguồn tại Việt Nam, túi gói hàng cỡ quần áo. Dữ liệu mô phỏng, không phải kết quả thí điểm.")}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <BigStat value="25–74%" label={t("lower added cost than random selection when packs need courier pickup", "chi phí phát sinh thấp hơn so với chọn ngẫu nhiên khi cần shipper lấy bao bì")} />
          <BigStat value={t("−231k VND", "−231 nghìn VND")} label={t("per 1,000 orders at 40% reusable with drop-off — about 25% of packaging cost", "trên 1.000 đơn ở mức 40% tái sử dụng khi khách tự gửi trả — khoảng 25% chi phí bao bì")} />
          <BigStat value={t("~4,000", "~4.000")} label={t("single-use packs avoided per day at Coolmate's volume (~10,000 orders/day), illustrative", "bao bì dùng một lần được tránh mỗi ngày ở quy mô Coolmate (~10.000 đơn/ngày), minh họa")} />
          <BigStat value={metrics.auc_model ? `${f.n(metrics.auc_model, 2)} vs ${f.n(metrics.auc_baseline_category_mean, 2)}` : "-"}
            label={t("return model AUC vs a category-only baseline, on newer orders", "AUC của mô hình so với mốc chỉ theo danh mục, trên các đơn mới hơn")} />
        </div>
        <div className="mt-6 rounded border p-5 text-sm">
          <b >{t("Honest limits", "Giới hạn được nêu rõ")}: </b>
          {t("CO₂ is not estimated yet (no sourced emission factor). EPR credits are excluded. Lost reusable bags are counted as waste. The 50% drop-off return rate is an assumption the pilot will measure.",
             "CO₂ chưa được ước tính (chưa có hệ số phát thải có nguồn). Không tính tín chỉ EPR. Túi tái sử dụng bị mất được tính là rác thải. Tỷ lệ khách tự gửi trả 50% là giả định sẽ được đo trong thí điểm.")}
        </div>
      </section>

      {/* Roadmap + targets */}
      <section>
        <div className="py-8">
          <h2 className="text-2xl font-bold">{t("A 12-month pilot with clear gates", "Thí điểm 12 tháng với các mốc rõ ràng")}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["M1–3", t("Historical-data pilot", "Thí điểm trên dữ liệu lịch sử"), t("Shadow mode: score the brand's past orders and compare with what really happened.", "Chế độ chạy song song: chấm điểm đơn cũ của thương hiệu và so với thực tế.")],
              ["M4–6", t("Live API + channel test", "API trực tiếp + thử kênh thu hồi"), t("Real orders, capped share, measure how many packs come back without a courier.", "Đơn thật, giới hạn tỷ lệ, đo số bao bì quay về không cần shipper.")],
              ["M7–12", t("Retrain & scale", "Huấn luyện lại & mở rộng"), t("Retrain on real outcomes, then add warehouses and brands — only if the gates are met.", "Huấn luyện lại trên kết quả thật, rồi mở rộng kho và thương hiệu — chỉ khi đạt các mốc.")],
            ].map(([m, title, body]) => (
              <div key={m} className="rounded border p-3">
                <p className="text-sm font-bold">{m}</p>
                <h3 className="mt-1 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-gray-500">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <BigStat value={`AUC ≥ ${f.n(TARGETS.auc, 2)}`} label={t("return prediction on real orders", "dự đoán hoàn hàng trên đơn thật")} />
            <BigStat value={f.pct(TARGETS.selfReturn)} label={t("packs returned without a courier", "bao bì quay về không cần shipper")} />
            <BigStat value={f.n(TARGETS.packsAvoidedPer1000)} label={t("single-use packs avoided per 1,000 orders", "bao bì dùng một lần được tránh trên 1.000 đơn")} />
            <BigStat value={`≥ ${f.pct(TARGETS.costSaving)}`} label={t("packaging cost saving vs all single-use", "tiết kiệm chi phí bao bì so với toàn bộ dùng một lần")} />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-8">
        <h2 className="text-2xl font-bold">{t("Simple SaaS pricing", "Bảng giá SaaS đơn giản")}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Starter", "3M", t("One brand, CSV workflow, dashboard, simulator and report.", "Một thương hiệu, quy trình CSV, tổng quan, mô phỏng và báo cáo.")],
            ["Growth", "7M", t("API integration, custom AI model, multiple data sets.", "Tích hợp API, mô hình AI riêng, nhiều bộ dữ liệu.")],
            ["Enterprise", "15M", t("Multi-warehouse, scheduled retraining, priority support.", "Nhiều kho, huấn luyện lại định kỳ, hỗ trợ ưu tiên.")],
          ].map(([name, price, body], i) => (
            <div key={name} className="rounded border p-4">
              <h3 className="font-semibold">{name}</h3>
              <p className="mt-3 text-2xl font-bold">{price} <span className="text-base font-normal">VND / {t("month", "tháng")}</span></p>
              <p className="mt-3 text-sm">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm">
          {t("Plus a one-time 15M VND integration fee. Add-ons: premium ESG/EPR reports, custom models, consulting. Planning prices, not signed contracts.",
             "Cộng phí tích hợp một lần 15 triệu VND. Dịch vụ thêm: báo cáo ESG/EPR nâng cao, mô hình riêng, tư vấn. Giá dự kiến, chưa phải hợp đồng đã ký.")}
        </p>
      </section>

      {/* Team */}
      <section id="team">
        <div className="py-8">
          <h2 className="text-2xl font-bold">{t("The Loopies", "Đội Loopies")}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Diva Meilla Sinaga, S.M.", t("Business development & partnerships", "Phát triển kinh doanh & đối tác")],
              ["Permata Andini Nisyah, S.M.", t("Finance, impact & compliance", "Tài chính, tác động & tuân thủ")],
              ["Aisha Nasywa Emiliana, S.T.", t("Operations & recovery system", "Vận hành & hệ thống thu hồi")],
              ["I Ketut Veda Suputra, S.Kom.", t("AI, website, data & product", "AI, website, dữ liệu & sản phẩm")],
            ].map(([name, role]) => (
              <div key={name} className="rounded border p-3">
                <p className="font-semibold">{name}</p>
                <p className="mt-1 text-sm">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-8 text-center">
        <h2 className="text-2xl font-bold">{t("The right package for every order.", "Đúng bao bì cho mọi đơn hàng.")}</h2>
        <p className="mx-auto mt-4 max-w-2xl">
          {t("Open the working prototype: upload orders, see the predictions, download the packing list.", "Mở bản mẫu đang chạy: tải đơn hàng lên, xem dự đoán, tải danh sách đóng gói.")}
        </p>
        <Link href={cta} className="mt-4 inline-block rounded border px-3 py-1 font-semibold">{ctaLabel} →</Link>
      </section>

      <footer className="border-t mt-8">
        <div className="flex flex-wrap justify-between gap-3 py-4 text-xs">
          <p>ReLoop AI · UEH Business Challenge 2026 · {t("All demo data is simulated.", "Toàn bộ dữ liệu demo là dữ liệu mô phỏng.")}</p>
          <Link href="/privacy" className="underline">{t("Data & Privacy", "Dữ liệu & Quyền riêng tư")}</Link>
        </div>
      </footer>
    </>
  );
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-2 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function ResultCard({ t, f, title, r }: { t: T; f: Fmt; title: string; r: ReturnType<typeof scoreOrder> }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs">{title}</p>
      <p className="mt-1 text-lg font-bold">{r.recommendation}</p>
      <p className="text-xs">RVS {f.n(r.rvs, 1)}</p>
      <p className="mt-1 text-xs">{t("Reusable", "Tái sử dụng")} {f.vnd(r.expCostReusableVnd)}<br />{t("Single-use", "Dùng một lần")} {f.vnd(r.expCostSingleVnd)}</p>
    </div>
  );
}
