import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import { loadContext } from "@/lib/context";
import { model as baseModel, trainingRows, type Params } from "@/lib/data";
import { trainModel, cannotTrain, MIN_TRAIN_ROWS, type TrainedModel } from "@/lib/train";
import type { T } from "@/lib/i18n";
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

export default function ModelPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Suspense fallback={<p>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, orgs, orgId, rows, qs, orgModel, t, f } = await loadContext(sp);
  const org = orgs.find((o) => o.id === orgId);
  const canEdit = org?.role === "owner" || org?.role === "editor";

  const train = trainingRows(rows);
  const why = cannotTrain(train, t);
  // Preview: what retraining would give right now (not saved)
  const preview: TrainedModel | null = why ? null : trainModel(train);
  const current = orgModel ?? (baseModel as TrainedModel);
  const keys = [...new Set([...Object.keys(current.coefficients), ...Object.keys(preview?.coefficients ?? {})])];
  const myData = t("\"My data\"", "\"Dữ liệu của tôi\"");

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-1">{t("AI Model", "Mô hình AI")}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {t("Retrain the return-prediction model on this data set's own order history (Custom AI Model). The model learns from delivered orders that have a",
           "Huấn luyện lại mô hình dự đoán hoàn hàng bằng lịch sử đơn hàng của chính bộ dữ liệu này (Custom AI Model). Mô hình học từ các đơn đã giao có cột")}{" "}
        <code>was_returned</code>{t(" column.", ".")}
      </p>

      <div className="rounded border p-3 mb-4 text-sm space-y-1">
        <p className="font-semibold">{t("Want to try retraining?", "Muốn thử huấn luyện lại?")}</p>
        <ol className="list-decimal pl-5">
          <li>{t("Download", "Tải")} <a className="underline" href="/contoh_latih_ulang.csv" download>contoh_latih_ulang.csv</a>{" "}
            {t("(1,000 simulated orders that already have a was_returned column).", "(1.000 đơn mô phỏng đã có cột was_returned).")}</li>
          <li>{t("Open", "Mở")} <a className="underline" href={`/upload?org=${orgId}`}>{t("Upload CSV", "Tải lên CSV")}</a>, {t(`choose ${myData}, then upload that file.`, `chọn ${myData}, rồi tải tệp đó lên.`)}</li>
          <li>{t(`Come back here, choose ${myData}, then click "Retrain and use this model".`, `Quay lại đây, chọn ${myData}, rồi bấm "Huấn luyện lại và dùng mô hình này".`)}</li>
        </ol>
        <p className="text-gray-500">{t("A real company uses its own order history with the same columns.", "Doanh nghiệp thật sẽ dùng lịch sử đơn hàng của chính họ với các cột tương tự.")}</p>
      </div>

      {sp.ok && <p className="rounded border border-green-600 p-2 mb-3 text-sm">{sp.ok}</p>}
      {sp.error && <p className="rounded border border-red-600 p-2 mb-3 text-sm">{sp.error}</p>}

      <form action="/model" className="flex items-end gap-3 text-sm mb-4">
        <label className="flex flex-col">{t("Data", "Dữ liệu")}
          <select name="org" defaultValue={orgId} className="rounded border bg-transparent p-1">
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <button className="rounded border px-3 py-1">{t("Select", "Chọn")}</button>
      </form>

      <section className="rounded border p-4 space-y-1 text-sm">
        <p><b>{t("Model in use", "Mô hình đang dùng")}:</b>{" "}
          {orgModel
            ? t(`this data set's own model, trained ${orgModel.trained_at.slice(0, 16).replace("T", " ")}`, `mô hình riêng của bộ dữ liệu này, huấn luyện ${orgModel.trained_at.slice(0, 16).replace("T", " ")}`)
            : t("built-in model (trained on simulated data)", "mô hình mặc định (huấn luyện trên dữ liệu mô phỏng)")}</p>
        <p>AUC {current.metrics?.auc_model ?? "-"} ({t("category-average baseline", "mốc theo trung bình danh mục")} {current.metrics?.auc_baseline_category_mean ?? "-"}),{" "}
          {t(`${current.metrics?.n_train ?? "-"} training orders, ${current.metrics?.n_test ?? "-"} test orders.`, `${current.metrics?.n_train ?? "-"} đơn huấn luyện, ${current.metrics?.n_test ?? "-"} đơn kiểm tra.`)}</p>
        <p>{t("Orders usable for training", "Số đơn dùng được để huấn luyện")}: <b>{f.n(train.length)}</b> ({t("minimum", "tối thiểu")} {MIN_TRAIN_ROWS}).</p>
      </section>

      {why && <p className="mt-3 text-sm">{t("Cannot train yet", "Chưa thể huấn luyện")}: {why}</p>}

      {preview && (
        <>
          <h2 className="font-semibold mt-6 mb-2">{t("Result if retrained now", "Kết quả nếu huấn luyện lại ngay")}</h2>
          <p className="text-sm mb-2">
            {t(`Trained on the ${preview.metrics.n_train} oldest orders, tested on the ${preview.metrics.n_test} newest (return rate ${f.pct(preview.metrics.test_return_rate)}).`,
               `Huấn luyện trên ${preview.metrics.n_train} đơn cũ nhất, kiểm tra trên ${preview.metrics.n_test} đơn mới nhất (tỷ lệ hoàn ${f.pct(preview.metrics.test_return_rate)}).`)}{" "}
            {t("Model AUC", "AUC của mô hình")} <b>{preview.metrics.auc_model}</b> {t("vs category baseline", "so với mốc theo danh mục")} <b>{preview.metrics.auc_baseline_category_mean}</b>
            {preview.metrics.auc_model > preview.metrics.auc_baseline_category_mean
              ? t(" — the model does better than looking at the category alone.", " — mô hình tốt hơn so với chỉ nhìn vào danh mục.")
              : t(" — the model is not better than the baseline yet; the data may be too small.", " — mô hình chưa tốt hơn mốc so sánh; có thể dữ liệu còn quá ít.")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b">
                <th>{t("Factor", "Yếu tố")}</th><th>{t("Model in use", "Mô hình đang dùng")}</th><th>{t("Retrained", "Sau khi huấn luyện lại")}</th>
              </tr></thead>
              <tbody>
                <tr className="border-b"><td>Intercept</td><td>{f.n(current.intercept, 3)}</td><td>{f.n(preview.intercept, 3)}</td></tr>
                {keys.map((k) => (
                  <tr key={k} className="border-b">
                    <td>{factorLabel(t, k)}</td>
                    <td>{current.coefficients[k] === undefined ? "-" : f.n(current.coefficients[k], 3)}</td>
                    <td>{preview.coefficients[k] === undefined ? "-" : f.n(preview.coefficients[k], 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t("Positive numbers raise the return probability, negative numbers lower it. Reference category", "Số dương làm tăng xác suất hoàn hàng, số âm làm giảm. Danh mục tham chiếu")}: {preview.reference_category}.
          </p>
        </>
      )}

      <div className="flex flex-wrap gap-3 mt-6 text-sm">
        {canEdit ? (
          <>
            {preview && (
              <form action={retrainModel}>
                <input type="hidden" name="org" value={orgId} />
                <button className="rounded border px-3 py-1 font-semibold">{t("Retrain and use this model", "Huấn luyện lại và dùng mô hình này")}</button>
              </form>
            )}
            {orgModel && (
              <form action={deleteModel}>
                <input type="hidden" name="org" value={orgId} />
                <button className="rounded border px-3 py-1">{t("Back to the built-in model", "Quay lại mô hình mặc định")}</button>
              </form>
            )}
          </>
        ) : (
          <p className="text-gray-500">
            {t(`Demo data is view-only. To save your own model, upload a CSV with a was_returned column to ${myData}, then come back here.`,
               `Dữ liệu demo chỉ để xem. Để lưu mô hình riêng, hãy tải CSV có cột was_returned lên ${myData}, rồi quay lại đây.`)}
          </p>
        )}
      </div>
    </>
  );
}
