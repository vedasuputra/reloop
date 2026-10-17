import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppPage from "@/components/AppPage";
import DescribedSelect from "@/components/DescribedSelect";
import Section from "@/components/Section";
import Stat from "@/components/Stat";
import { TEAL, TEAL_LIGHT } from "@/components/DashboardCharts";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, DownloadIcon, LINK, Meter, Notice, PageTitle, StepNo, TABLE_BOX, TH, TR, Tag } from "@/components/ui";
import { loadContext } from "@/lib/context";
import { orgOptions } from "@/components/orgOptions";
import { model as baseModel, trainingRows, type Params } from "@/lib/data";
import { trainModel, cannotTrain, MIN_TRAIN_ROWS, type TrainedModel } from "@/lib/train";
import { TARGETS } from "@/lib/targets";
import type { T } from "@/lib/i18n";
import { testPart, groupStats, wrongCases, topFactors } from "@/lib/fairness";
import { retrainModel, deleteModel } from "./actions";

function factorLabel(t: T, k: string) {
  const L: Record<string, string> = {
    multi_size: t("Bought more than one size", "Mua nhiều hơn một cỡ"),
    cod: t("Cash on delivery (COD)", "Thanh toán khi nhận hàng (COD)"),
    voucher_used: t("Used a voucher", "Dùng voucher"),
    qty_2plus: t("2 or more items", "Từ 2 sản phẩm trở lên"),
    has_history: t("Has ordered before", "Đã từng đặt hàng"),
    cust_rr: t("Customer's past return rate (0-1)", "Tỷ lệ hoàn trước đây của khách (0-1)"),
  };
  return L[k] ?? (k.startsWith("cat_") ? t(`Category ${k.slice(4)}`, `Danh mục ${k.slice(4)}`) : k);
}

export const metadata = { title: "AI model" };

export default function ModelPage({ searchParams }: { searchParams: Promise<Params> }) {
  return <AppPage><Content searchParams={searchParams} /></AppPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, orgs, orgId, rows, qs, orgModel, model, scored, t, f } = await loadContext(sp);
  const org = orgs.find((o) => o.id === orgId);
  const canEdit = org?.role === "owner" || org?.role === "editor";

  const train = trainingRows(rows);
  const why = cannotTrain(train, t);
  // Preview: what retraining would give right now (not saved)
  const preview: TrainedModel | null = why ? null : trainModel(train);
  const current = orgModel ?? (baseModel as TrainedModel);
  const keys = [...new Set([...Object.keys(current.coefficients), ...Object.keys(preview?.coefficients ?? {})])];
  const maxCoef = Math.max(0.01, ...keys.flatMap((k) => [Math.abs(current.coefficients[k] ?? 0), Math.abs(preview?.coefficients[k] ?? 0)]));
  // Fairness and wrong cases: measured on the newest 25% of labelled orders with the model in use
  const test = testPart(train);
  const recOf = new Map(scored.map((s) => [s.row.order_id, s.r.recommendation]));
  const fairness = [
    { title: t("Payment method", "Hình thức thanh toán"), stats: groupStats(test, model, recOf, [
      { name: "COD", test: (r) => r.payment_method === "COD" },
      { name: t("Prepaid (card, e-wallet, transfer)", "Trả trước (thẻ, ví điện tử, chuyển khoản)"), test: (r) => r.payment_method !== "COD" },
    ]) },
    { title: t("Customer type", "Loại khách hàng"), stats: groupStats(test, model, recOf, [
      { name: t("New customer", "Khách mới"), test: (r) => r.past_delivered_in_data === 0 },
      { name: t("Returning customer", "Khách quay lại"), test: (r) => r.past_delivered_in_data > 0 },
    ]) },
  ];
  const wrong = test.length ? wrongCases(test, model) : [];
  const myData = t("your own data", "dữ liệu riêng của bạn");
  const aucNow: number | undefined = current.metrics?.auc_model;
  const aucBase: number | undefined = current.metrics?.auc_baseline_category_mean;
  // AUC 0.5 is a coin flip, so the bars run from 0.5 to 1
  const aucBar = (v: number | undefined) => (v === undefined ? 0 : (v - 0.5) / 0.5);
  const when = orgModel?.trained_at.slice(0, 16).replace("T", " ");


  return (
    <AppShell qs={qs} email={user?.email}>
      <PageTitle title={t("AI model", "Mô hình AI")}
        sub={<>
          {t("Retrain the return-prediction model on this data set's own order history (Custom AI Model). The model learns from delivered orders that have a",
            "Huấn luyện lại mô hình dự đoán hoàn hàng bằng lịch sử đơn hàng của chính bộ dữ liệu này (Custom AI Model). Mô hình học từ các đơn đã giao có cột")}{" "}
          <b className="font-semibold text-[#174538]">was_returned</b>{t(" column.", ".")}
        </>}
        aside={
          <form action="/model" className="flex h-full items-center rounded-[9px] border border-[#174538]/15 bg-white px-4 py-3">
            <div className="w-full"><DescribedSelect name="org" label={t("Data", "Dữ liệu")} defaultValue={orgId} options={orgOptions(orgs, t)} compact /></div>
            <noscript><p className="text-xs text-[#355E3B]">{t("Turn on JavaScript to change the data set.", "Hãy bật JavaScript để đổi bộ dữ liệu.")}</p></noscript>
          </form>
        } />

      {sp.ok && <Notice tone="ok" role="status" className="rl-rise mt-6">{sp.ok}</Notice>}
      {sp.error && <Notice tone="warn" role="alert" className="rl-rise mt-6">{sp.error}</Notice>}


      {/* The model in use */}
      <Section title={t("Model in use", "Mô hình đang dùng")}
        sub={orgModel
          ? t(`This data set's own model, trained ${when}.`, `Mô hình riêng của bộ dữ liệu này, huấn luyện ${when}.`)
          : t("Built-in model, trained on simulated data.", "Mô hình mặc định, huấn luyện trên dữ liệu mô phỏng.")} i={2}>
        <div className="grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-2 xl:grid-cols-4">
          <Stat layout="cell" variant="green" label={t("Model", "Mô hình")} value={orgModel ? t("Your own", "Của bạn") : t("Built-in", "Mặc định")}
            note={t("logistic regression", "hồi quy logistic")} />
          <Stat layout="cell" label="AUC" value={aucNow === undefined ? "-" : f.n(aucNow, 2)}
            note={t(`category baseline ${aucBase === undefined ? "-" : f.n(aucBase, 2)} · pilot target ≥ ${f.n(TARGETS.auc, 2)}`, `mốc theo danh mục ${aucBase === undefined ? "-" : f.n(aucBase, 2)} · mục tiêu thí điểm ≥ ${f.n(TARGETS.auc, 2)}`)} />
          <Stat layout="cell" label={t("Training and test orders", "Đơn huấn luyện và kiểm tra")} value={`${current.metrics?.n_train ?? "-"} / ${current.metrics?.n_test ?? "-"}`}
            note={t("oldest 75% to train, newest 25% to test", "75% cũ nhất để huấn luyện, 25% mới nhất để kiểm tra")} />
          <Stat layout="cell" label={t("Orders usable for training", "Số đơn dùng được để huấn luyện")} value={f.n(train.length)}
            note={t(`minimum ${MIN_TRAIN_ROWS}`, `tối thiểu ${MIN_TRAIN_ROWS}`)} />
        </div>

        <div className={`${CARD} mt-5`}>
          <h3 className="font-semibold">{t("How accurate is the ranking?", "Mô hình xếp hạng chính xác đến đâu?")}</h3>
          <div className="mt-4 space-y-4">
            {[
              { label: t("Model", "Mô hình"), v: aucNow, color: TEAL },
              { label: t("Category-average baseline", "Mốc theo trung bình danh mục"), v: aucBase, color: TEAL_LIGHT },
              { label: t("Pilot target (month 12)", "Mục tiêu thí điểm (tháng 12)"), v: TARGETS.auc, color: "#174538" },
            ].map((b) => (
              <div key={b.label}>
                <div className="flex items-baseline justify-between text-sm"><span>{b.label}</span><b>{b.v === undefined ? "-" : f.n(b.v, 2)}</b></div>
                <div className="mt-1.5"><Meter value={aucBar(b.v)} color={b.color} label={b.label} /></div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#355E3B]">
            {t("AUC 0.50 is a coin flip and 1.00 is perfect, so the bars run from 0.50. Measured on newer orders that were not used for training.",
              "AUC 0,50 là tung đồng xu và 1,00 là hoàn hảo, nên thanh chạy từ 0,50. Đo trên các đơn mới hơn, không dùng để huấn luyện.")}
          </p>
        </div>

        {!orgModel && (
          <Notice tone="warn" title={t("The built-in model proves the pipeline, not real-world accuracy", "Mô hình mặc định chỉ chứng minh quy trình, chưa phải độ chính xác thực tế")} className="mt-5">
            {t("It is trained on simulated orders. In the pilot it first runs in shadow mode: ReLoop trains on the brand's approved order data and compares its predictions with what really happened, before any packing instruction depends on it. That is also why cost carries 55% of the score and the prediction only 30% through pack return.",
              "Mô hình được huấn luyện trên đơn mô phỏng. Trong thí điểm, mô hình chạy ở chế độ song song trước: ReLoop huấn luyện trên dữ liệu đơn hàng đã được duyệt của thương hiệu và so dự đoán với thực tế, trước khi có chỉ dẫn đóng gói nào phụ thuộc vào nó. Đó cũng là lý do chi phí chiếm 55% điểm số còn dự đoán chỉ chiếm 30% thông qua khả năng bao bì quay về.")}
          </Notice>
        )}
      </Section>

      {/* Retrain */}
      <Section title={t("Retrain on your own data", "Huấn luyện lại bằng dữ liệu của bạn")}
        sub={t("A real company uses its own order history with the same columns.", "Doanh nghiệp thật sẽ dùng lịch sử đơn hàng của chính họ với các cột tương tự.")} i={3}>
        <div className={CARD}>
          <h3 className="font-semibold">{t("Want to try retraining?", "Muốn thử huấn luyện lại?")}</h3>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed">
            <li className="flex gap-3"><StepNo n={1} />
              <span>
                {t("Download", "Tải")} <a className={LINK} href="/contoh_latih_ulang.csv" download>contoh_latih_ulang.csv</a>{" "}
                {t("(1,000 simulated orders that already have a was_returned column).", "(1.000 đơn mô phỏng đã có cột was_returned).")}
              </span></li>
            <li className="flex gap-3"><StepNo n={2} />
              <span>
                {t("Open", "Mở")} <Link className={LINK} href={`/upload?org=${orgId}`}>{t("Upload data (CSV)", "Tải dữ liệu lên (CSV)")}</Link>, {t(`choose ${myData}, then upload that file.`, `chọn ${myData}, rồi tải tệp đó lên.`)}
              </span></li>
            <li className="flex gap-3"><StepNo n={3} />
              <span>{t(`Come back here, choose ${myData}, then click “Retrain and use this model”.`, `Quay lại đây, chọn ${myData}, rồi bấm “Huấn luyện lại và dùng mô hình này”.`)}</span></li>
          </ol>
        </div>

        {why && <Notice tone="info" title={t("Cannot train yet", "Chưa thể huấn luyện")} className="mt-5">{why}</Notice>}

        {preview && (
          <div className={`${CARD} mt-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">{t("Result if retrained now", "Kết quả nếu huấn luyện lại ngay")}</h3>
              {preview.metrics.auc_model > preview.metrics.auc_baseline_category_mean
                ? <Tag tone="ok">{t("Better than the category baseline", "Tốt hơn mốc theo danh mục")}</Tag>
                : <Tag tone="warn">{t("Not better than the baseline yet", "Chưa tốt hơn mốc so sánh")}</Tag>}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">
              {t(`Trained on the ${preview.metrics.n_train} oldest orders, tested on the ${preview.metrics.n_test} newest (return rate ${f.pct(preview.metrics.test_return_rate)}).`,
                `Huấn luyện trên ${preview.metrics.n_train} đơn cũ nhất, kiểm tra trên ${preview.metrics.n_test} đơn mới nhất (tỷ lệ hoàn ${f.pct(preview.metrics.test_return_rate)}).`)}
              {preview.metrics.auc_model <= preview.metrics.auc_baseline_category_mean && " " + t("The data may be too small.", "Có thể dữ liệu còn quá ít.")}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                { label: t("Retrained model, AUC", "Mô hình huấn luyện lại, AUC"), v: preview.metrics.auc_model, color: TEAL },
                { label: t("Category baseline, AUC", "Mốc theo danh mục, AUC"), v: preview.metrics.auc_baseline_category_mean, color: TEAL_LIGHT },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex items-baseline justify-between text-sm"><span>{b.label}</span><b>{f.n(b.v, 2)}</b></div>
                  <div className="mt-1.5"><Meter value={aucBar(b.v)} color={b.color} label={b.label} /></div>
                </div>
              ))}
            </div>

            <div className={`${TABLE_BOX} mt-5`}>
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[#174538]/15">
                    <th className={TH}>{t("Factor", "Yếu tố")}</th><th className={TH}>{t("Model in use", "Mô hình đang dùng")}</th><th className={TH}>{t("Retrained", "Sau khi huấn luyện lại")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={TR}>
                    <td className="px-4 py-3 text-[#355E3B]">Intercept</td>
                    <td className="px-4 py-3">{f.n(current.intercept, 3)}</td><td className="px-4 py-3">{f.n(preview.intercept, 3)}</td>
                  </tr>
                  {keys.map((k) => (
                    <tr key={k} className={TR}>
                      <td className="px-4 py-3">{factorLabel(t, k)}</td>
                      <td className="px-4 py-3"><CoefBar v={current.coefficients[k]} max={maxCoef} f={f.n} /></td>
                      <td className="px-4 py-3"><CoefBar v={preview.coefficients[k]} max={maxCoef} f={f.n} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#355E3B]">
              {t("Positive numbers raise the return probability, negative numbers lower it. Reference category", "Số dương làm tăng xác suất hoàn hàng, số âm làm giảm. Danh mục tham chiếu")}: {preview.reference_category}.
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {canEdit ? (
            <>
              {preview && (
                <form action={retrainModel}>
                  <input type="hidden" name="org" value={orgId} />
                  <button className={BTN_PRIMARY}>{t("Retrain and use this model", "Huấn luyện lại và dùng mô hình này")}</button>
                </form>
              )}
              {orgModel && (
                <form action={deleteModel}>
                  <input type="hidden" name="org" value={orgId} />
                  <button className={BTN_OUTLINE}>{t("Back to the built-in model", "Quay lại mô hình mặc định")}</button>
                </form>
              )}
              {!preview && !orgModel && (
                <Link href={`/upload?org=${orgId}`} className={BTN_OUTLINE}><DownloadIcon />{t("Upload labelled orders", "Tải lên đơn có nhãn")}</Link>
              )}
            </>
          ) : (
            <Notice tone="plain" className="w-full">
              {t(`Demo data is view-only. To save your own model, upload a CSV with a was_returned column to ${myData}, then come back here.`,
                `Dữ liệu demo chỉ để xem. Để lưu mô hình riêng, hãy tải CSV có cột was_returned lên ${myData}, rồi quay lại đây.`)}
            </Notice>
          )}
        </div>
      </Section>

      {test.length > 0 && (
        <>
          <Section title={t("Fairness by group", "Công bằng theo nhóm")}
            sub={t(`Measured with the model in use on the ${f.n(test.length)} newest labelled orders (not used for training). A fair model predicts close to what actually happens in every group. The decision only changes which bag is used, never price or service.`,
              `Đo bằng mô hình đang dùng trên ${f.n(test.length)} đơn có nhãn mới nhất (không dùng để huấn luyện). Mô hình công bằng dự đoán sát với thực tế ở mọi nhóm. Quyết định chỉ thay đổi loại túi, không bao giờ thay đổi giá hay dịch vụ.`)} i={4}>
            <div className="grid gap-5">
              {fairness.map(({ title, stats }) => {
                const gaps = stats.map((x) => x.predictedRate - x.actualRate);
                const reuse = stats.map((x) => x.reusableShare);
                return (
                  <div key={title} className={CARD}>
                    <h3 className="font-semibold">{title}</h3>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="border-b border-[#174538]/15">
                            <th className={TH}>{t("Group", "Nhóm")}</th><th className={TH}>{t("Orders", "Đơn")}</th><th className={TH}>{t("Actual", "Thực tế")}</th>
                            <th className={TH}>{t("Predicted", "Dự đoán")}</th><th className={TH}>{t("Gap", "Chênh lệch")}</th><th className={TH}>AUC</th><th className={TH}>{t("Reusable", "Reusable")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.map((x, i) => (
                            <tr key={x.group} className="border-b border-[#174538]/10 last:border-0 align-top">
                              <td className="px-4 py-3 font-semibold">{x.group}</td>
                              <td className="px-4 py-3">{f.n(x.n)}</td>
                              <td className="px-4 py-3"><MiniBar v={x.actualRate} color={TEAL_LIGHT} text={f.pct(x.actualRate)} /></td>
                              <td className="px-4 py-3"><MiniBar v={x.predictedRate} color={TEAL} text={f.pct(x.predictedRate)} /></td>
                              <td className="whitespace-nowrap px-4 py-3">{gaps[i] >= 0 ? "+" : ""}{f.n(gaps[i] * 100, 1)} {t("pts", "điểm")}</td>
                              <td className="px-4 py-3">{x.auc === null ? "-" : f.n(x.auc, 2)}</td>
                              <td className="px-4 py-3">{f.pct(x.reusableShare)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 border-t border-[#174538]/10 pt-3 text-xs leading-relaxed text-[#355E3B]">
                      {t(`Largest calibration gap between groups: ${f.n(Math.abs(gaps[0] - gaps[1]) * 100, 1)} pts. Difference in Reusable share: ${f.n(Math.abs(reuse[0] - reuse[1]) * 100, 1)} pts.`,
                        `Chênh lệch hiệu chuẩn lớn nhất giữa các nhóm: ${f.n(Math.abs(gaps[0] - gaps[1]) * 100, 1)} điểm. Chênh lệch tỷ lệ Reusable: ${f.n(Math.abs(reuse[0] - reuse[1]) * 100, 1)} điểm.`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={t("Where the model is wrong", "Những trường hợp mô hình dự đoán sai")}
            sub={t("The test orders where the predicted return probability was furthest from what actually happened. Returns are partly random, so no model gets every order right; this is why cost carries 55% of the score and the prediction only 30% through pack return.",
              "Các đơn kiểm tra có xác suất hoàn dự đoán lệch xa nhất so với thực tế. Việc hoàn hàng có phần ngẫu nhiên nên không mô hình nào đúng mọi đơn; vì vậy chi phí chiếm 55% điểm số, còn dự đoán chỉ ảnh hưởng 30% qua khả năng bao bì quay về.")} i={5}>
            <div className={TABLE_BOX}>
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[#174538]/15">
                    <th className={TH}>{t("Order", "Đơn")}</th><th className={TH}>{t("Category", "Danh mục")}</th><th className={TH}>{t("Predicted", "Dự đoán")}</th>
                    <th className={TH}>{t("What happened", "Thực tế")}</th><th className={TH}>{t("Main reasons for the prediction", "Lý do chính của dự đoán")}</th>
                  </tr>
                </thead>
                <tbody>
                  {wrong.map((w) => (
                    <tr key={w.row.order_id} className={`${TR} align-top`}>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link href={`/order${qs}&order=${w.row.order_id}`} className="font-semibold underline underline-offset-2">{w.row.order_id}</Link>
                      </td>
                      <td className="px-4 py-3">{w.row.category}</td>
                      <td className="px-4 py-3 font-semibold">{f.pct(w.predicted)}</td>
                      <td className="px-4 py-3">{w.row.was_returned === 1 ? <Tag tone="warn">{t("returned", "đã hoàn")}</Tag> : <Tag tone="ok">{t("kept", "giữ lại")}</Tag>}</td>
                      <td className="px-4 py-3 text-xs leading-relaxed text-[#355E3B]">
                        {topFactors(model, w.row).map(([k, v]) => `${factorLabel(t, k)} (${v > 0 ? "+" : ""}${f.n(v, 2)})`).join(", ") || t("no strong factor", "không có yếu tố nổi bật")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </AppShell>
  );
}

/** A coefficient with a small bar that grows right from the middle line when it raises the return probability, left when it lowers it. */
function CoefBar({ v, max, f }: { v: number | undefined; max: number; f: (x: number, digits?: number) => string }) {
  if (v === undefined) return <span className="text-[#355E3B]">-</span>;
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-right">{f(v, 3)}</span>
      <div className="relative h-3 w-28 shrink-0" aria-hidden>
        <div className="absolute inset-y-0 left-1/2 w-px bg-[#174538]/30" />
        {v !== 0 && (
          <div className="absolute inset-y-0.5 rounded-[2px]"
            style={{ background: v > 0 ? TEAL : TEAL_LIGHT, width: `${(Math.abs(v) / max) * 50}%`, ...(v > 0 ? { left: "50%" } : { right: "50%" }) }} />
        )}
      </div>
    </div>
  );
}

/** A share with a thin bar under it, the same look as the probability column on the Orders screen. */
function MiniBar({ v, color, text }: { v: number; color: string; text: string }) {
  return (
    <div>
      <p className="font-semibold">{text}</p>
      <div className="mt-1.5 h-1.5 w-16 overflow-hidden rounded-[2px] bg-[#d0f0e7]">
        <div className="h-full" style={{ width: `${Math.min(100, v * 100)}%`, background: color }} />
      </div>
    </div>
  );
}
