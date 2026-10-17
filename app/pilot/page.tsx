import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppPage from "@/components/AppPage";
import Controls from "@/components/Controls";
import SettingsBar from "@/components/SettingsBar";
import Section from "@/components/Section";
import { CARD, GREEN, H, PageTitle, StepNo, TABLE_BOX, TH, TR, Tag, rise } from "@/components/ui";
import { loadContext } from "@/lib/context";
import type { Params } from "@/lib/data";
import { TARGETS } from "@/lib/targets";
import { methodLabel } from "@/lib/i18n";
import { settingsItems } from "@/lib/orderView";

export const metadata = { title: "Pilot plan" };

export default function Pilot({ searchParams }: { searchParams: Promise<Params> }) {
  return <AppPage><Content searchParams={searchParams} /></AppPage>;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, model, orgs, orgId, scored, qs, hasCustom, t, f } = await loadContext(sp);

  // The same numbers as the Dashboard's pilot targets
  const n = Math.max(1, scored.length);
  const reusable = scored.filter((s) => s.r.recommendation === "REUSABLE");
  const base = scored.reduce((a, s) => a + s.r.expCostSingleVnd, 0);
  const withReloop = scored.reduce((a, s) => a + (s.r.recommendation === "REUSABLE" ? s.r.expCostReusableVnd : s.r.expCostSingleVnd), 0);
  const saving = base > 0 ? (base - withReloop) / base : 0;
  const packsPer1000 = (reusable.length / n) * 1000;
  const metrics = (model as { metrics?: { auc_model?: number; auc_baseline_category_mean?: number } }).metrics;
  const auc = metrics?.auc_model;
  const aucBase = metrics?.auc_baseline_category_mean;
  const selfReturn: number = cfg.generator.dropoff_recovery_target.value;
  const recovery = mean((reusable.length ? reusable : scored).map((s) => s.r.packReturnProb));
  const RECOVERY_TARGET = 0.7; // "recovery ≥ 70%" in the team's scaling criteria
  const pickupFee: number = cfg.logistics.ghn_tariff_vnd.value.noi_tinh * cfg.logistics.pickup_order_share.value;
  const perUse = cfg.packaging.reusable_pack_vnd.value / cfg.packaging.reuse_cycles.value + cfg.packaging.cleaning_per_reuse_vnd.value;

  // Go / No-Go gates: the criterion, this prototype's simulated baseline for reference, and when the real value is measured.
  // There is no pass / fail here: the data is simulated, so judging it would say nothing about the pilot.
  const gates: { name: string; note: string; baseline: string; target: string; when: string }[] = [
    { name: t("Packaging cost saving vs all single-use", "Tiết kiệm chi phí bao bì so với toàn bộ dùng một lần"), note: t("Better or defensible total cost", "Tổng chi phí tốt hơn hoặc có thể bảo vệ được"),
      baseline: f.pct(saving), target: `≥ ${f.pct(TARGETS.costSaving)}`, when: t("Months 5–7, real orders in shadow mode", "Tháng 5–7, đơn thật ở chế độ song song") },
    { name: t("Single-use packs avoided per 1,000 orders", "Bao bì dùng một lần được tránh trên 1.000 đơn"), note: t("At a 40% reusable share", "Ở mức 40% tái sử dụng"),
      baseline: f.n(packsPer1000), target: `≥ ${f.n(TARGETS.packsAvoidedPer1000)}`, when: t("Months 5–7, real orders in shadow mode", "Tháng 5–7, đơn thật ở chế độ song song") },
    { name: t("Return-prediction accuracy (AUC)", "Độ chính xác dự đoán hoàn hàng (AUC)"), note: t("On newer orders not used for training", "Trên các đơn mới hơn, không dùng để huấn luyện"),
      baseline: auc === undefined ? "-" : f.n(auc, 2), target: `≥ ${f.n(TARGETS.auc, 2)}`, when: t("Months 5–7, on real return outcomes", "Tháng 5–7, trên kết quả hoàn hàng thực tế") },
    { name: t("Model beats the category-only baseline", "Mô hình vượt mốc chỉ theo danh mục"), note: t("Model decisions add value", "Quyết định của mô hình tạo thêm giá trị"),
      baseline: auc === undefined || aucBase === undefined ? "-" : `${f.n(auc, 2)} vs ${f.n(aucBase, 2)}`, target: t("higher AUC", "AUC cao hơn"), when: t("Months 5–7, on real return outcomes", "Tháng 5–7, trên kết quả hoàn hàng thực tế") },
    { name: t("Packs returned without a courier", "Bao bì gửi trả không cần shipper"), note: t("The key pilot variable. Here it is the assumption in Cost settings; the pilot measures it", "Biến số then chốt của thí điểm. Ở đây là giả định trong Cài đặt chi phí; thí điểm sẽ đo thật"),
      baseline: f.pct(selfReturn), target: `≥ ${f.pct(TARGETS.selfReturn)}`, when: t("Months 5–7, return-channel test", "Tháng 5–7, thử nghiệm kênh thu hồi") },
    { name: t("Pack recovery on Reusable orders", "Tỷ lệ thu hồi bao bì của đơn Reusable"), note: t("Operational recovery is workable", "Việc thu hồi vận hành được"),
      baseline: f.pct(recovery), target: `≥ ${f.pct(RECOVERY_TARGET)}`, when: t("Months 5–7, return-channel test", "Tháng 5–7, thử nghiệm kênh thu hồi") },
    { name: t("CO₂ and savings claims", "Tuyên bố về CO₂ và mức tiết kiệm"), note: t("No unsupported claims: CO₂ stays unestimated until a sourced emission factor exists", "Không đưa ra tuyên bố thiếu căn cứ: CO₂ chưa được ước tính cho đến khi có hệ số phát thải có nguồn"),
      baseline: t("none made", "chưa đưa ra"), target: t("only measured", "chỉ số đã đo"), when: t("Throughout: only measured figures are claimed", "Xuyên suốt: chỉ công bố số liệu đã đo") },
    { name: t("Security review and brand approval", "Đánh giá bảo mật và phê duyệt của thương hiệu"), note: t("Needs a person to sign it off before any rollout", "Cần có người phê duyệt trước mọi đợt triển khai"),
      baseline: "–", target: t("signed off", "đã phê duyệt"), when: t("Before any rollout, from month 8", "Trước mọi đợt triển khai, từ tháng 8") },
  ];

  const phases: { months: string; title: string; items: string[]; here?: boolean }[] = [
    { months: t("Months 1–2", "Tháng 1–2"), title: t("Discover & govern", "Khảo sát & quản trị"), items: [
      t("Agree data use, retention and access rules.", "Thống nhất quy tắc sử dụng, lưu giữ và truy cập dữ liệu."),
      t("Map order, return, packaging and warehouse fields.", "Ánh xạ các trường đơn hàng, hoàn hàng, bao bì và kho."),
      t("The demo uses ReLoop's simulated template data.", "Bản demo dùng dữ liệu mẫu mô phỏng của ReLoop."),
    ] },
    { months: t("Months 3–4", "Tháng 3–4"), title: t("Configure the B2B MVP", "Cấu hình MVP B2B"), here: true, items: [
      t("Brand inputs: pack price, return method, warehouses and courier tariff.", "Đầu vào của thương hiệu: giá bao bì, cách thu hồi, kho và cước vận chuyển."),
      t("The simulator updates without AI retraining.", "Bộ mô phỏng cập nhật mà không cần huấn luyện lại AI."),
      t("ReLoop controls the RVS weights and threshold.", "ReLoop kiểm soát trọng số và ngưỡng RVS."),
    ] },
    { months: t("Months 5–7", "Tháng 5–7"), title: t("One-brand pilot", "Thí điểm với một thương hiệu"), items: [
      t("Train on approved brand order data; ReLoop operates the training.", "Huấn luyện trên dữ liệu đơn hàng đã được duyệt của thương hiệu; ReLoop vận hành việc huấn luyện."),
      t("Shadow mode: compare predictions with actual outcomes.", "Chế độ chạy song song: so sánh dự đoán với kết quả thực tế."),
      t("Measure recovery, loss, cleaning and total cost.", "Đo mức thu hồi, thất lạc, vệ sinh và tổng chi phí."),
    ] },
    { months: t("Months 8–12", "Tháng 8–12"), title: t("Retrain & scale", "Huấn luyện lại & mở rộng"), items: [
      t("Scheduled retraining using permitted outcomes.", "Huấn luyện lại theo lịch bằng các kết quả được phép sử dụng."),
      t("Integrate approved systems and multi-warehouse logic.", "Tích hợp các hệ thống đã được duyệt và logic nhiều kho."),
      t("Security review and an evidence-based rollout decision.", "Đánh giá bảo mật và quyết định triển khai dựa trên bằng chứng."),
    ] },
  ];

  const risks: [string, string, string][] = [
    [t(`Courier pickup erases savings: about ${f.vnd(pickupFee)} per pickup, ${Math.round(pickupFee / perUse)}× the reuse cost`, `Shipper đến lấy xóa mất khoản tiết kiệm: khoảng ${f.vnd(pickupFee)} mỗi lần lấy, gấp ${Math.round(pickupFee / perUse)} lần chi phí mỗi lần tái sử dụng`),
      t("No empty-pack pickups: recover via returns, failed deliveries (8–12%, free), exchanges and store drop-off. Never Reusable if dearer.", "Không cho shipper đi lấy bao bì rỗng: thu hồi qua hoàn hàng, giao thất bại (8–12%, miễn phí), đổi hàng và gửi tại cửa hàng. Không bao giờ Reusable nếu đắt hơn."),
      t("Reusable only for box-shipped orders (wins in about 16%).", "Chỉ dùng tái sử dụng cho đơn gửi bằng hộp (có lợi ở khoảng 16%).")],
    [t("Packs not returned or damaged: the self-return rate is an assumption", "Bao bì không quay về hoặc hư hỏng: tỷ lệ tự gửi trả là một giả định"),
      t("Deposit or voucher (RePack reports 95%): return with the next delivery, an inspection step, and the loss cost counted in the simulator.", "Đặt cọc hoặc voucher (RePack báo cáo 95%): trả cùng lần giao sau, có bước kiểm tra, và chi phí thất lạc được tính trong bộ mô phỏng."),
      t("Courier preset: RVS cuts Reusable automatically.", "Cài đặt shipper: RVS tự động giảm đơn Reusable.")],
    [t(`The model is trained on simulated data: AUC ${auc === undefined ? "-" : f.n(auc, 2)} proves the pipeline only`, `Mô hình được huấn luyện trên dữ liệu mô phỏng: AUC ${auc === undefined ? "-" : f.n(auc, 2)} chỉ chứng minh quy trình`),
      t("Shadow-mode pilot and retraining on brand data. Cost is 55% of the RVS, which limits the effect of prediction error.", "Thí điểm chạy song song và huấn luyện lại trên dữ liệu thương hiệu. Chi phí chiếm 55% RVS nên hạn chế ảnh hưởng của sai số dự đoán."),
      t("Rule-based fallback on category and return history.", "Phương án dự phòng theo quy tắc dựa trên danh mục và lịch sử hoàn hàng.")],
    [t("Low staff adoption, weaker brand feel", "Nhân viên ít áp dụng, cảm nhận thương hiệu yếu hơn"),
      t("One instruction per order: Review goes to a supervisor queue. Training, and branded reusable packs.", "Mỗi đơn một chỉ dẫn: Review chuyển vào hàng đợi giám sát. Có đào tạo, và túi tái sử dụng mang thương hiệu."),
      t("One warehouse, repeat customers first.", "Một kho, ưu tiên khách quay lại.")],
    [t("Data privacy and security", "Quyền riêng tư và bảo mật dữ liệu"),
      t("Permissioned, minimal data under Vietnam's data protection rules, and a security review before rollout.", "Dữ liệu tối thiểu và được cho phép theo quy định bảo vệ dữ liệu của Việt Nam, và đánh giá bảo mật trước khi triển khai."),
      t("Anonymised exports only.", "Chỉ dùng dữ liệu xuất đã ẩn danh.")],
    [t("Slower sales than planned", "Doanh số chậm hơn kế hoạch"),
      t("Lean costs, the integration fee paid upfront, and a pilot-to-paid conversion target.", "Chi phí tinh gọn, thu phí tích hợp trả trước, và mục tiêu chuyển từ thí điểm sang trả phí."),
      t("Contract hires until revenue arrives (conservative case: −213M VND).", "Thuê theo hợp đồng cho đến khi có doanh thu (kịch bản thận trọng: −213 triệu VND).")],
  ];

  const expansion = [
    t("Coolmate: Hanoi and HCMC, all product lines, stores as drop-off points.", "Coolmate: Hà Nội và TP.HCM, mọi dòng sản phẩm, cửa hàng làm điểm gửi trả."),
    t("D2C fashion brands with branded mailers or boxes.", "Các thương hiệu thời trang D2C dùng túi hoặc hộp in thương hiệu."),
    t("Marketplace sellers and courier drop-off networks.", "Người bán trên sàn thương mại điện tử và mạng lưới điểm gửi trả của đơn vị vận chuyển."),
    t("Beauty and electronics: a new brand means new inputs, and the model retrains on its own data.", "Làm đẹp và điện tử: thương hiệu mới nghĩa là đầu vào mới, và mô hình huấn luyện lại trên dữ liệu của chính nó."),
  ];
  const scaling: [string, string][] = [
    [t("People", "Nhân sự"), t("Ops, ML, Customer Success, DevOps & Security; later Sales and ESG.", "Vận hành, ML, Chăm sóc khách hàng, DevOps & Bảo mật; sau đó là Kinh doanh và ESG.")],
    [t("Operations", "Vận hành"), t("A shared pack pool, cleaning capacity and drop-off points.", "Kho túi dùng chung, năng lực vệ sinh và các điểm gửi trả.")],
    [t("Technology", "Công nghệ"), t("Cloud, per-brand API integration and security controls.", "Đám mây, tích hợp API theo từng thương hiệu và các biện pháp kiểm soát bảo mật.")],
    [t("Funding", "Vốn"), t("Runway for the conservative-case gap (about 213M VND).", "Nguồn vốn đủ cho khoản chênh lệch của kịch bản thận trọng (khoảng 213 triệu VND).")],
    [t("Constraint", "Ràng buộc"), t("Scale only as fast as recovery and security allow.", "Chỉ mở rộng nhanh như mức thu hồi và bảo mật cho phép.")],
  ];

  return (
    <AppShell qs={qs} email={user?.email}
      footerNote={t("Planning assumptions, not signed contracts or validated sales.", "Các giả định lập kế hoạch, không phải hợp đồng đã ký hay doanh số đã được kiểm chứng.")}>
      <SettingsBar targetId="settings-panel" changeLabel={t("Change settings", "Đổi cài đặt")} items={settingsItems(t, orgs, orgId, presetKey, method)} />
      <PageTitle title={t("Pilot plan", "Kế hoạch thí điểm")}
        sub={t("Validate within 12 months that ReLoop AI can pick which orders should use reusable packaging, so single-use packaging falls at the lowest possible cost: one brand first, then a paid subscription. Scale only on evidence.",
          "Kiểm chứng trong 12 tháng rằng ReLoop AI chọn được những đơn nào nên dùng bao bì tái sử dụng, để bao bì dùng một lần giảm với chi phí thấp nhất: trước hết với một thương hiệu, sau đó là gói đăng ký trả phí. Chỉ mở rộng khi có bằng chứng.")} />

      <div id="settings-panel" className="rl-rise relative z-20 mt-6" style={rise(1)}>
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/pilot" />
      </div>

      {/* Go / No-Go */}
      <Section title={t("Go / No-Go gates", "Các tiêu chí Go / No-Go")}
        sub={t("The criteria for deciding whether to scale, and when each one is measured. The simulated baseline is for reference only; the real decision is made each month on measured pilot data.",
          "Các tiêu chí để quyết định có mở rộng hay không, và thời điểm đo từng tiêu chí. Mốc mô phỏng chỉ để tham khảo; quyết định thật được đưa ra hằng tháng dựa trên dữ liệu đo từ thí điểm.")} i={2}>
        <div className={TABLE_BOX}>
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-[#174538]/15">
                <th className={TH}>{t("Gate", "Tiêu chí")}</th><th className={TH}>{t("Simulated baseline", "Mốc mô phỏng")}</th>
                <th className={TH}>{t("Target", "Mục tiêu")}</th><th className={TH}>{t("Measured in", "Đo vào")}</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((g) => (
                <tr key={g.name} className={`${TR} align-top`}>
                  <td className="px-4 py-3"><p className="font-semibold">{g.name}</p><p className="mt-0.5 max-w-md text-xs leading-relaxed text-[#355E3B]">{g.note}</p></td>
                  <td className="whitespace-nowrap px-4 py-3 text-base font-medium text-[#355E3B]">{g.baseline}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{g.target}</td>
                  <td className="px-4 py-3 text-xs leading-relaxed text-[#355E3B]">{g.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#355E3B]">
          {t(`Simulated baseline: calculated on this data set and these settings (${methodLabel(t, method).toLowerCase()}), so it shows where the model starts, not a result. The pilot replaces it with measured values.`,
            `Mốc mô phỏng: tính trên bộ dữ liệu và cài đặt này (${methodLabel(t, method).toLowerCase()}), nên cho thấy điểm xuất phát của mô hình chứ không phải kết quả. Thí điểm sẽ thay nó bằng giá trị đo được.`)}
        </p>
        <h3 className="mt-8 font-semibold">{t("How the decision is made", "Cách đưa ra quyết định")}</h3>
        <div className="mt-3 grid gap-5 md:grid-cols-3">
          <div className="rounded-[9px] border border-[#b7dccf] bg-[#DEF4EE] p-5">
            <p className="font-semibold">GO</p>
            <p className="mt-2 text-sm leading-relaxed">{t("Proceed only with evidence: better or defensible total cost, workable recovery, model decisions that add value, and security and brand approval.", "Chỉ tiến hành khi có bằng chứng: tổng chi phí tốt hơn hoặc bảo vệ được, thu hồi vận hành được, quyết định của mô hình tạo thêm giá trị, cùng phê duyệt về bảo mật và của thương hiệu.")}</p>
          </div>
          <div className="rounded-[9px] border border-[#d4e3a9] bg-[#F5FBE2] p-5">
            <p className="font-semibold">HOLD</p>
            <p className="mt-2 text-sm leading-relaxed">{t("Fix the gaps before rollout.", "Khắc phục các thiếu sót trước khi triển khai.")}</p>
          </div>
          <div className="rounded-[9px] border border-[#174538]/25 bg-[#FFFDD0] p-5">
            <p className="font-semibold">NO-GO</p>
            <p className="mt-2 text-sm leading-relaxed">{t("Total cost rises without an approved strategic reason, recovery assumptions fail, the model does not beat the baseline, or data or security approval is missing. Refine and retest, or stop.", "Tổng chi phí tăng mà không có lý do chiến lược được duyệt, giả định thu hồi không đạt, mô hình không vượt mốc so sánh, hoặc thiếu phê duyệt về dữ liệu hay bảo mật. Hãy cải tiến và thử lại, hoặc dừng.")}</p>
          </div>
        </div>
      </Section>

      {/* Roadmap */}
      <Section title={t("Roadmap", "Lộ trình")} sub={t("Twelve months in four phases, with one brand.", "Mười hai tháng trong bốn giai đoạn, với một thương hiệu.")} i={3}>
        <ol className="grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/20 bg-[#174538]/20 md:grid-cols-2 xl:grid-cols-4">
          {phases.map((p, i) => (
            <li key={p.title} className="flex flex-col bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <StepNo n={i + 1} />
                {p.here && <Tag tone="ok">{t("In this prototype", "Có trong bản mẫu này")}</Tag>}
              </div>
              <p className="mt-4 text-xs font-semibold text-[#355E3B]">{p.months}</p>
              <h3 className="mt-1 text-lg font-semibold">{p.title}</h3>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#355E3B]">
                {p.items.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-[#355E3B]">
          {t("Success gates: permissioned data only, evaluation against real return outcomes, recovery and total cost measured, no unsupported savings or CO₂ claims, and security and operational approval before rollout.",
            "Tiêu chí thành công: chỉ dùng dữ liệu được cho phép, đánh giá dựa trên kết quả hoàn hàng thực tế, đo mức thu hồi và tổng chi phí, không có tuyên bố tiết kiệm hay CO₂ thiếu căn cứ, và phê duyệt về bảo mật và vận hành trước khi triển khai.")}
        </p>
      </Section>

      {/* Risks */}
      <Section title={t("Risks, mitigation and Plan B", "Rủi ro, giảm thiểu và Phương án B")} i={4}>
        <div className={TABLE_BOX}>
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-[#174538]/15">
                <th className={TH}>{t("Risk", "Rủi ro")}</th><th className={TH}>{t("Mitigation", "Giảm thiểu")}</th><th className={TH}>{t("Plan B", "Phương án B")}</th>
              </tr>
            </thead>
            <tbody>
              {risks.map(([risk, mitigation, planB]) => (
                <tr key={risk} className={`${TR} align-top`}>
                  <td className="w-1/3 px-4 py-3 font-semibold">{risk}</td>
                  <td className="w-1/3 px-4 py-3 leading-relaxed text-[#355E3B]">{mitigation}</td>
                  <td className="w-1/3 px-4 py-3 leading-relaxed text-[#355E3B]">{planB}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Scale */}
      <Section title={t("From one brand to a platform", "Từ một thương hiệu đến một nền tảng")} i={5}>
        <div className="grid gap-5 xl:grid-cols-3">
          <div className={CARD}>
            <h3 className="font-semibold">{t("Pilot success criteria", "Tiêu chí thành công của thí điểm")}</h3>
            <ol className="mt-4 space-y-4 text-sm leading-relaxed">
              <li className="flex gap-3"><StepNo n={1} /><span><b>{t("Prove with one brand.", "Chứng minh với một thương hiệu.")}</b> <span className="text-[#355E3B]">{t("Shadow-mode pilot: approved order and return data only.", "Thí điểm chạy song song: chỉ dùng dữ liệu đơn hàng và hoàn hàng đã được duyệt.")}</span></span></li>
              <li className="flex gap-3"><StepNo n={2} /><span><b>{t("Standardize onboarding.", "Chuẩn hóa quy trình tiếp nhận.")}</b> <span className="text-[#355E3B]">{t("Reusable data mapping, packaging inputs, courier tariffs and warehouse setup.", "Ánh xạ dữ liệu dùng lại được, đầu vào bao bì, cước vận chuyển và thiết lập kho.")}</span></span></li>
              <li className="flex gap-3"><StepNo n={3} /><span><b>{t("Expand by evidence.", "Mở rộng dựa trên bằng chứng.")}</b> <span className="text-[#355E3B]">{t("Add brands and warehouses after security, workflow and unit economics pass review.", "Thêm thương hiệu và kho sau khi bảo mật, quy trình và hiệu quả kinh tế đơn vị được thông qua.")}</span></span></li>
            </ol>
            <p className="mt-4 border-t border-[#174538]/10 pt-3 text-xs leading-relaxed text-[#355E3B]">
              {t("Targets: recovery ≥ 70%, Reusable cost ≤ single-use, the model beats the baseline.", "Mục tiêu: thu hồi ≥ 70%, chi phí Reusable ≤ dùng một lần, mô hình vượt mốc so sánh.")}
            </p>
          </div>
          <div className={CARD}>
            <h3 className="font-semibold">{t("Expansion strategy", "Chiến lược mở rộng")}</h3>
            <p className="mt-1 text-xs text-[#355E3B]">{t("Same engine, new brands and categories.", "Cùng một công cụ, thương hiệu và danh mục mới.")}</p>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed">
              {expansion.map((x, i) => <li key={x} className="flex gap-3"><StepNo n={i + 1} /><span>{x}</span></li>)}
            </ol>
          </div>
          <div className={CARD}>
            <h3 className="font-semibold">{t("What scaling requires", "Mở rộng đòi hỏi gì")}</h3>
            <dl className="mt-4 space-y-3 text-sm leading-relaxed">
              {scaling.map(([k, v]) => (
                <div key={k}><dt className="font-semibold">{k}</dt><dd className="text-[#355E3B]">{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {/* Governance */}
      <Section title={t("Governance, hiring and partners", "Quản trị, tuyển dụng và đối tác")} i={6}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className={`rounded-[9px] p-5 ${GREEN}`}>
            <p className="font-semibold">{t("Governance", "Quản trị")}</p>
            <p className="mt-2 text-sm leading-relaxed opacity-90">
              {t("ReLoop owns the model and the RVS weights; the brand owns its data and sets pack price, return method and tariffs. Monthly steering decides go or no-go by the pilot gates: no unmeasured savings or CO₂ claims.",
                "ReLoop sở hữu mô hình và trọng số RVS; thương hiệu sở hữu dữ liệu của mình và đặt giá bao bì, cách thu hồi và cước vận chuyển. Cuộc họp điều phối hằng tháng quyết định go hay no-go theo các tiêu chí của thí điểm: không có tuyên bố tiết kiệm hay CO₂ chưa được đo.")}
            </p>
          </div>
          <div className={CARD}>
            <p className="font-semibold">{t("Hiring and partners", "Tuyển dụng và đối tác")}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm leading-snug text-[#355E3B]">
              <li>{t("Months 5–7: Ops Coordinator, ML Engineer (contract).", "Tháng 5–7: Điều phối vận hành, Kỹ sư ML (hợp đồng).")}</li>
              <li>{t("Months 8–12: Customer Success, DevOps & Security (contract).", "Tháng 8–12: Chăm sóc khách hàng, DevOps & Bảo mật (hợp đồng).")}</li>
              <li>{t("Partners: pack supplier, cleaning, courier (GHN / SPX), recycling, legal.", "Đối tác: nhà cung cấp bao bì, vệ sinh, vận chuyển (GHN / SPX), tái chế, pháp lý.")}</li>
            </ul>
          </div>
        </div>
      </Section>

      <div className={`rl-rise mt-12 rounded-[9px] px-6 py-10 text-center ${GREEN}`} style={rise(7)}>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75">{t("Final value proposition", "Đề xuất giá trị cuối cùng")}</p>
        <p className={`${H} mx-auto mt-3 max-w-3xl text-3xl italic leading-tight md:text-4xl`}>
          {t("The right package for every order.", "Đúng bao bì cho mọi đơn hàng.")}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed opacity-90">
          {t("ReLoop AI picks the right package for every order, cutting single-use packaging at the lowest cost and saving money wherever packs can return without a courier. We sell decisions, not packaging.",
            "ReLoop AI chọn đúng bao bì cho mọi đơn hàng, giảm bao bì dùng một lần với chi phí thấp nhất và tiết kiệm tiền ở bất cứ nơi nào bao bì có thể quay về mà không cần shipper. Chúng tôi bán quyết định, không bán bao bì.")}
        </p>
        <p className="mt-4 text-xs opacity-75">
          <Link href={`/simulator${qs}`} className="underline underline-offset-2 hover:opacity-80">{t("Try the scenario simulator", "Thử bộ mô phỏng kịch bản")}</Link>
        </p>
      </div>
    </AppShell>
  );
}
