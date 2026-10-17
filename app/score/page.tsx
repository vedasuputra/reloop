import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppPage from "@/components/AppPage";
import Controls from "@/components/Controls";
import SettingsBar from "@/components/SettingsBar";
import SoftForm from "@/components/SoftForm";
import ScrollOnMount from "@/components/ScrollOnMount";
import OrderDetailView from "@/components/OrderDetailView";
import { Field, NumberInput, SelectInput, CheckRow } from "@/components/FormControls";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, H, Notice, PageTitle, rise } from "@/components/ui";
import { loadContext } from "@/lib/context";
import type { Params, Row, Scored } from "@/lib/data";
import { scoreOrder, type Order } from "@/lib/rvs";
import { buildOrderDetail, categoryBaselines, orderLabels } from "@/lib/orderDetail";
import { methodLabel, type T } from "@/lib/i18n";
import { settingsItems } from "@/lib/orderView";

const CATEGORIES = ["Accessories", "Activewear", "Dress", "Jeans", "Outerwear", "Shirt", "T-shirt", "Trousers"];
const PAYMENTS = ["COD", "Bank transfer", "E-wallet", "Credit/debit card"];
/** The form's own fields, kept in the address so a result can be shared and a settings change does not clear the form. */
const ORDER_FIELDS = ["category", "payment", "qty", "km", "past", "rr", "multi", "voucher"];

export const metadata = { title: "Score a new order" };

export default function ScoreOne({ searchParams }: { searchParams: Promise<Params> }) {
  return <AppPage><Content searchParams={searchParams} /></AppPage>;
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
  const { user, method, presetKey, cfg, model, modelLabel, orgs, orgId, scored, qs, hasCustom, t, f } = await loadContext(sp);

  const submitted = sp.category !== undefined;
  const { order, errors } = submitted ? readOrder(sp, t) : { order: undefined, errors: [] as string[] };

  // The typed order, shaped like an order from the data set, so the same details view can draw it
  let detail: ReturnType<typeof buildOrderDetail> | null = null;
  if (order) {
    const r = scoreOrder(cfg, model, order, method);
    const row = {
      id: 0, order_id: t("New order", "Đơn mới"), customer_id: "-", address: null, order_date: null, category: order.category,
      quantity_of_item: order.quantity_of_item, order_value_vnd: 0, multi_size: order.multi_size, payment_method: order.payment_method,
      voucher_used: order.voucher_used, estimated_delivery_distance_km: order.estimated_delivery_distance_km, order_status: "New",
      past_delivered_in_data: order.past_delivered_in_data, customer_return_rate_in_data: order.customer_return_rate_in_data, was_returned: null, data_source: "typed",
    } as Row;
    const s: Scored = { row, order, r, lostProb: 0 };
    detail = buildOrderDetail({ s, baselines: categoryBaselines(scored), cfg, model, modelLabel, method, t, f });
    detail.fields = [
      { label: t("Category", "Danh mục"), value: order.category + (order.multi_size ? t(" (multi-size)", " (nhiều cỡ)") : "") },
      { label: t("Payment", "Thanh toán"), value: order.payment_method },
      { label: t("Items", "Số sản phẩm"), value: String(order.quantity_of_item) },
      { label: t("Distance", "Khoảng cách"), value: `${order.estimated_delivery_distance_km} km` },
      { label: t("Voucher", "Voucher"), value: order.voucher_used ? t("Used", "Có dùng") : t("Not used", "Không dùng") },
      { label: t("Earlier orders", "Đơn trước đây"), value: String(order.past_delivered_in_data) },
      { label: t("Past return rate", "Tỷ lệ hoàn trước đây"), value: order.customer_return_rate_in_data === null ? t("New customer", "Khách mới") : f.pct(order.customer_return_rate_in_data) },
    ];
  }

  // Settings changes keep what was typed (only the filled-in fields, so an empty form does not count as submitted)
  const hidden = Object.fromEntries(ORDER_FIELDS.filter((k) => sp[k] !== undefined && sp[k] !== "").map((k) => [k, sp[k] as string]));

  return (
    <AppShell qs={qs} email={user?.email}>
      <SettingsBar targetId="settings-panel" changeLabel={t("Change settings", "Đổi cài đặt")} items={settingsItems(t, orgs, orgId, presetKey, method)} />
      <PageTitle title={t("Score a new order", "Chấm điểm đơn mới")}
        sub={t("Fill in one order and ReLoop calculates its return probability and packaging recommendation. Nothing is saved.",
          "Nhập thông tin một đơn hàng, ReLoop sẽ tính xác suất hoàn hàng và đề xuất bao bì. Không có dữ liệu nào được lưu.")}
        actions={<Link href={`/orders${qs}`} className={BTN_OUTLINE}>{t("All orders", "Tất cả đơn hàng")}</Link>} />

      <div id="settings-panel" className="rl-rise relative z-20 mt-6" style={rise(1)}>
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/score" hidden={hidden}
          modelNote={`${t("Return prediction uses", "Dự đoán hoàn hàng dùng")} ${modelLabel}.`} />
      </div>

      <div className={`mt-10 grid gap-x-8 gap-y-6 xl:grid-cols-[2fr_3fr] ${detail ? "items-start" : "items-stretch"}`}>
        {/* Left: the order and the customer, all going downwards; it follows the page while the result is read */}
        <div className="rl-rise xl:sticky xl:top-24" style={rise(2)}>
          <h2 className={`${H} text-3xl`}>{t("Order details", "Chi tiết đơn hàng")}</h2>
          <SoftForm action="/score" className={`${CARD} mt-6`}>
            <input type="hidden" name="method" value={method} /><input type="hidden" name="preset" value={presetKey} /><input type="hidden" name="org" value={orgId} />

            <h2 className={`${H} text-2xl`}>{t("The order", "Đơn hàng")}</h2>
            <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Field label={t("Product category", "Danh mục sản phẩm")}>
                <SelectInput name="category" defaultValue={sp.category ?? ""} required placeholder={t("Choose…", "Chọn…")} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
              </Field>
              <Field label={t("Payment method", "Hình thức thanh toán")}>
                <SelectInput name="payment" defaultValue={sp.payment ?? ""} required placeholder={t("Choose…", "Chọn…")} options={PAYMENTS.map((p) => ({ value: p, label: p }))} />
              </Field>
              <Field label={t("Number of items", "Số sản phẩm")}>
                <NumberInput name="qty" defaultValue={sp.qty ?? "1"} min={1} max={100} />
              </Field>
              <Field label={t("Delivery distance", "Khoảng cách giao hàng")}>
                <NumberInput name="km" defaultValue={sp.km ?? "20"} min={0} max={3000} step="any" suffix="km" />
              </Field>
              <div className="sm:col-span-2"><CheckRow name="multi" defaultChecked={sp.multi === "1"}>{t("Bought the same item in more than one size", "Mua cùng một sản phẩm với nhiều cỡ")}</CheckRow></div>
              <div className="sm:col-span-2"><CheckRow name="voucher" defaultChecked={sp.voucher === "1"}>{t("Used a voucher", "Dùng voucher")}</CheckRow></div>
            </div>

            {/* the line runs edge to edge of the box */}
            <hr className="-mx-5 my-6 border-0 border-t border-[#174538]/15" />
            <h2 className={`${H} text-2xl`}>{t("The customer", "Khách hàng")}</h2>
            <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Field label={t("Earlier delivered orders", "Số đơn đã giao trước đây")}>
                <NumberInput name="past" defaultValue={sp.past ?? "0"} min={0} max={1000} required={false} />
              </Field>
              <Field label={t("Past return rate", "Tỷ lệ hoàn trước đây")} hint={t("Leave empty for a new customer.", "Để trống nếu là khách mới.")}>
                <NumberInput name="rr" defaultValue={sp.rr ?? ""} min={0} max={100} step="any" suffix="%" required={false} />
              </Field>
            </div>

            <div className="-mx-5 mt-6 flex flex-wrap items-center gap-3 border-t border-[#174538]/15 px-5 pt-5">
              <button className={BTN_PRIMARY}>{t("Get recommendation", "Xem đề xuất")}</button>
              {submitted && <Link href={`/score${qs}`} className={BTN_OUTLINE}>{t("Clear", "Xóa")}</Link>}
            </div>
          </SoftForm>
        </div>

        {/* Right: the result, or a placeholder until there is one. The heading is always there, level with "Order details" */}
        <div className="flex min-w-0 flex-col">
          <h2 className={`${H} rl-rise text-3xl`}>{t("Result", "Kết quả")}</h2>

          {errors.length > 0 && (
            <Notice tone="warn" role="alert" title={t("Please check the form", "Vui lòng kiểm tra lại biểu mẫu")} className="rl-rise mt-6">
              <ul className="list-disc space-y-0.5 pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </Notice>
          )}

          {detail && order ? (
            <div id="result" className="scroll-mt-6">
              <ScrollOnMount key={JSON.stringify(order) + method + presetKey + orgId} id="result" />
              <OrderDetailView d={detail} l={orderLabels(t, methodLabel(t, method))} start={1} />
            </div>
          ) : errors.length === 0 && (
            <div className="rl-rise mt-6 flex min-h-[16rem] flex-1 items-center justify-center xl:min-h-0 rounded-[9px] border border-dashed border-[#174538]/30 bg-white/60 p-8 text-center" style={rise(3)}>
              <p className="text-sm text-[#355E3B]">{t("Results will be displayed here.", "Kết quả sẽ hiển thị ở đây.")}</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
