import { Suspense } from "react";
import { connection } from "next/server";
import Nav from "@/components/Nav";
import { getOrgs, getCostSettings, getOrgModel, DEMO_ORG } from "@/lib/context";
import { readSettings, settingsFromConfig, model as baseModel, PRESETS, CUSTOM_PRESET, type Params } from "@/lib/data";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import { getT, methodLabel, presetLabel, reasonText, type T } from "@/lib/i18n";
import { scoreOrder, type Order, type Model, type CollectionMethod } from "@/lib/rvs";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["Accessories", "Activewear", "Dress", "Jeans", "Outerwear", "Shirt", "T-shirt", "Trousers"];
const PAYMENTS = ["COD", "Bank transfer", "E-wallet", "Credit/debit card"];

export default function ScoreOne({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Read the form; returns the order, or a list of problems. */
function readOrder(sp: Params, t: T): { order?: Order; errors: string[] } {
  const errors: string[] = [];
  const num = (k: string, lo: number, hi: number, label: string, dflt?: number) => {
    const raw = (sp[k] ?? "").replace(",", ".").trim();
    if (raw === "" && dflt !== undefined) return dflt;
    const v = Number(raw);
    if (raw === "" || !Number.isFinite(v) || v < lo || v > hi) { errors.push(t(`${label} must be a number from ${lo} to ${hi}.`, `${label} phải là số từ ${lo} đến ${hi}.`)); return 0; }
    return v;
  };
  const category = CATEGORIES.includes(sp.category ?? "") ? sp.category! : "";
  if (!category) errors.push(t("Choose a category.", "Hãy chọn danh mục."));
  const payment = PAYMENTS.includes(sp.payment ?? "") ? sp.payment! : "";
  if (!payment) errors.push(t("Choose a payment method.", "Hãy chọn hình thức thanh toán."));
  const qty = num("qty", 1, 100, t("Number of items", "Số sản phẩm"));
  const past = num("past", 0, 1000, t("Earlier orders", "Số đơn trước đây"), 0);
  const rr = num("rr", 0, 100, t("Customer return rate (%)", "Tỷ lệ hoàn của khách (%)"), -1);
  const km = num("km", 0, 3000, t("Delivery distance (km)", "Khoảng cách giao hàng (km)"));
  if (past === 0 && rr > 0) errors.push(t("Customer return rate can only be filled in if the customer has ordered before.", "Chỉ nhập tỷ lệ hoàn khi khách đã từng đặt hàng."));
  if (errors.length) return { errors };
  return {
    errors,
    order: {
      category, payment_method: payment,
      multi_size: sp.multi === "1" ? 1 : 0, voucher_used: sp.voucher === "1" ? 1 : 0,
      quantity_of_item: Math.round(qty), past_delivered_in_data: Math.round(past),
      customer_return_rate_in_data: past > 0 && rr >= 0 ? rr / 100 : null,
      estimated_delivery_distance_km: km,
    },
  };
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const supabase = await createClient();
  const { t, f } = await getT();
  const { data: { user } } = await supabase.auth.getUser();
  const orgs = await getOrgs();
  const orgId = orgs.some((o) => o.id === sp.org) ? sp.org! : (orgs[0]?.id ?? DEMO_ORG);
  const custom = await getCostSettings(orgId);
  const { method, presetKey, cfg } = readSettings(sp, custom);
  const orgModel = await getOrgModel(orgId);
  const model: Model = orgModel ?? baseModel;
  const qs = `?method=${method}&preset=${presetKey}&org=${orgId}`;

  const submitted = sp.category !== undefined;
  const { order, errors } = submitted ? readOrder(sp, t) : { order: undefined, errors: [] as string[] };
  const r = order ? scoreOrder(cfg, model, order, method) : null;
  const other: CollectionMethod = method === "dropoff" ? "courier_pickup" : "dropoff";
  const r2 = order ? scoreOrder(cfg, model, order, other) : null;
  const w = settingsFromConfig(cfg).weights;
  const field = "rounded border bg-transparent p-1";

  return (
    <>
      <Nav qs={qs} email={user?.email} />
      <h1 className="text-2xl font-bold mb-1">{t("Check One Order", "Kiểm tra một đơn")}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {t("Fill in one order and ReLoop calculates its return probability and packaging recommendation. Nothing is saved.",
           "Nhập thông tin một đơn hàng, ReLoop sẽ tính xác suất hoàn hàng và đề xuất bao bì. Không có dữ liệu nào được lưu.")}
      </p>

      <form action="/score" className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded border p-4 text-sm">
        <label className="flex flex-col">{t("Product category", "Danh mục sản phẩm")}
          <select name="category" defaultValue={sp.category ?? ""} className={field} required>
            <option value="" disabled>{t("Choose…", "Chọn…")}</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col">{t("Payment method", "Hình thức thanh toán")}
          <select name="payment" defaultValue={sp.payment ?? ""} className={field} required>
            <option value="" disabled>{t("Choose…", "Chọn…")}</option>
            {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex flex-col">{t("Number of items", "Số sản phẩm")}
          <input name="qty" type="number" min={1} max={100} defaultValue={sp.qty ?? "1"} className={field} required />
        </label>
        <label className="flex flex-col">{t("Delivery distance (km)", "Khoảng cách giao hàng (km)")}
          <input name="km" type="number" min={0} max={3000} step="any" defaultValue={sp.km ?? "20"} className={field} required />
        </label>
        <label className="flex flex-col">{t("Customer's earlier delivered orders", "Số đơn đã giao trước đây của khách")}
          <input name="past" type="number" min={0} max={1000} defaultValue={sp.past ?? "0"} className={field} />
        </label>
        <label className="flex flex-col">{t("Customer's past return rate (%)", "Tỷ lệ hoàn trước đây của khách (%)")}
          <input name="rr" type="number" min={0} max={100} step="any" defaultValue={sp.rr ?? ""}
            placeholder={t("leave empty for a new customer", "để trống nếu là khách mới")} className={field} />
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" name="multi" value="1" defaultChecked={sp.multi === "1"} /> {t("Bought the same item in more than one size", "Mua cùng một sản phẩm với nhiều cỡ")}</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="voucher" value="1" defaultChecked={sp.voucher === "1"} /> {t("Used a voucher", "Dùng voucher")}</label>

        <label className="flex flex-col">{t("Data (settings & model)", "Dữ liệu (cài đặt & mô hình)")}
          <select name="org" defaultValue={orgId} className={field}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col">{t("Brand type (single-use packaging)", "Loại thương hiệu (bao bì dùng một lần)")}
          <select name="preset" defaultValue={presetKey} className={field}>
            {custom && <option value={CUSTOM_PRESET}>{presetLabel(t, CUSTOM_PRESET)}</option>}
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{presetLabel(t, p.key, p.label)}</option>)}
          </select>
        </label>
        <label className="flex flex-col">{t("How packs come back", "Cách thu hồi bao bì")}
          <select name="method" defaultValue={method} className={field}>
            <option value="courier_pickup">{t("Courier pickup", "Shipper đến lấy")}</option>
            <option value="dropoff">{t("Drop-off (no courier)", "Khách tự gửi trả (không cần shipper)")}</option>
          </select>
        </label>
        <div className="flex items-end"><button className="rounded border px-4 py-1 font-semibold">{t("Get recommendation", "Xem đề xuất")}</button></div>
      </form>

      {errors.length > 0 && (
        <ul className="rounded border border-red-600 p-3 mt-4 text-sm list-disc pl-6">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}

      {r && r2 && (
        <>
          <section className="rounded border p-4 mt-6 space-y-1">
            <p className="text-sm text-gray-500">{methodLabel(t, method)} · {orgModel ? t("this data set's own model", "mô hình riêng của bộ dữ liệu này") : t("built-in model (simulated data)", "mô hình mặc định (dữ liệu mô phỏng)")}</p>
            <p className="text-3xl font-bold">{r.recommendation}</p>
            <p>{t("Return probability", "Xác suất hoàn hàng")}: <b>{f.pct(r.predReturnProb)}</b> · RVS {f.n(r.rvs, 1)} / 100 (REUSABLE ≥ 70, REVIEW 40-69, SINGLE-USE &lt; 40)</p>
            <p className="text-sm">{t("Why", "Lý do")}: {reasonText(t, f, r, method)}</p>
          </section>
          <ScoreBreakdown r={r} w={w} cycles={cfg.packaging.reuse_cycles.value} method={method} />
          <p className="text-sm mt-4">
            {other === "dropoff"
              ? t("For comparison, if customers return the pack without a courier", "Để so sánh, nếu khách tự gửi trả bao bì không cần shipper")
              : t("For comparison, if a courier picks up the pack", "Để so sánh, nếu shipper đến lấy bao bì")}: RVS {f.n(r2.rvs, 1)}, <b>{r2.recommendation}</b>.
          </p>
        </>
      )}
    </>
  );
}
