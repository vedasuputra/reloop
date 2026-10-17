import { Suspense, type CSSProperties } from "react";
import { connection } from "next/server";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AppShellSkeleton from "@/components/AppShellSkeleton";
import PageSkeleton from "@/components/PageSkeleton";
import Controls from "@/components/Controls";
import SettingsBar from "@/components/SettingsBar";
import OrderDetailView from "@/components/OrderDetailView";
import { loadContext } from "@/lib/context";
import type { Params } from "@/lib/data";
import { methodLabel } from "@/lib/i18n";
import { settingsItems } from "@/lib/orderView";
import { buildOrderDetail, categoryBaselines, orderLabels } from "@/lib/orderDetail";

export const metadata = { title: "Order" };

const BTN = "inline-flex h-10 items-center gap-2 rounded-[9px] px-4 text-sm font-semibold transition-opacity hover:opacity-85";
const rise = (i: number) => ({ "--d": `${i * 0.08}s` }) as CSSProperties;

/**
 * One order as a full page (a shared link, or a new tab). On the Orders page the same details open as a popup instead.
 * The details are drawn by the same view as the popup.
 */
export default function OrderPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={
      <Suspense fallback={<AppShellSkeleton />}>
        <AppShell><PageSkeleton /></AppShell>
      </Suspense>
    }>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, orgs, orgId, scored, qs, hasCustom, model, modelLabel, t, f } = await loadContext(sp);

  const wanted = (sp.order ?? "").trim().toUpperCase();
  const found = scored.find((x) => x.row.order_id.toUpperCase() === wanted);
  const s = found ?? scored.find((x) => x.row.order_status === "Delivered") ?? scored[0];
  if (!s) {
    return <AppShell qs={qs} email={user?.email}><p className="text-sm">{t("No orders yet.", "Chưa có đơn hàng.")}</p></AppShell>;
  }
  const at = scored.indexOf(s);
  const prev = scored[at - 1], next = scored[at + 1];
  const link = (id: string) => `/order${qs}&order=${id}`;
  const d = buildOrderDetail({ s, baselines: categoryBaselines(scored), cfg, model, modelLabel, method, t, f });
  const labels = orderLabels(t, methodLabel(t, method));

  return (
    <AppShell qs={qs} email={user?.email}>
      <SettingsBar targetId="settings-panel" changeLabel={t("Change settings", "Đổi cài đặt")} items={settingsItems(t, orgs, orgId, presetKey, method)} />

      <div className="rl-rise flex items-center gap-2 text-sm">
        {prev ? <Link className={`${BTN} border border-[#174538]/40 bg-white`} href={link(prev.row.order_id)}>&lt; {prev.row.order_id}</Link> : null}
        <Link className={`${BTN} border border-[#174538]/40 bg-white`} href={`/orders${qs}`}>{t("All orders", "Tất cả đơn hàng")}</Link>
        <div className="flex-1" />
        {next ? <Link className={`${BTN} border border-[#174538]/40 bg-white`} href={link(next.row.order_id)}>{next.row.order_id} &gt;</Link> : null}
      </div>

      <div className="rl-rise mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4" style={rise(1)}>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{d.id}</h1>
        </div>
        <form action="/order" className="flex items-end gap-2">
          <input type="hidden" name="method" value={method} /><input type="hidden" name="preset" value={presetKey} /><input type="hidden" name="org" value={orgId} />
          <label className="text-sm font-semibold">
            {t("Open another order", "Mở đơn hàng khác")}
            <input name="order" placeholder="O000123" defaultValue="" className="mt-1.5 block h-10 w-40 rounded-[9px] border border-[#174538]/25 bg-white px-3 text-sm font-normal text-[#174538] outline-none placeholder:text-[#355E3B]/60 focus:border-[#174538]" />
          </label>
          <button className={`${BTN} cursor-pointer border border-[#174538]/40 bg-white`}>{t("Show", "Xem")}</button>
        </form>
      </div>

      {/* relative z-20: the open dropdown lists must paint above the sections below */}
      <div id="settings-panel" className="rl-rise relative z-20 mt-6" style={rise(2)}>
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/order" hidden={{ order: d.id }} />
      </div>

      <OrderDetailView d={d} l={labels} start={3} />
    </AppShell>
  );
}
