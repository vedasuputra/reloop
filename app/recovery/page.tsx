import { connection } from "next/server";
import Link from "next/link";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import AppPage from "@/components/AppPage";
import Controls from "@/components/Controls";
import SettingsBar from "@/components/SettingsBar";
import SoftForm from "@/components/SoftForm";
import Section from "@/components/Section";
import Stat from "@/components/Stat";
import { Field, NumberInput } from "@/components/FormControls";
import { BAND, TEAL, TEAL_LIGHT } from "@/components/DashboardCharts";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, Dot, GREEN, LINK, Notice, PageTitle, StepNo, TABLE_BOX, TH, TR, Tag, rise } from "@/components/ui";
import { loadContext } from "@/lib/context";
import { scoreAll, settingsFromConfig, type Params, type Scored } from "@/lib/data";
import { methodLabel } from "@/lib/i18n";
import { settingsItems } from "@/lib/orderView";

export const metadata = { title: "Pack recovery" };

const DEFAULT_DAILY = 10000; // Coolmate's volume in the team's plan
const DEFAULT_DAYS = 30;
const MAX_DAYS = 60;         // the return window

export default function Recovery({ searchParams }: { searchParams: Promise<Params> }) {
  return <AppPage><Content searchParams={searchParams} /></AppPage>;
}

/** A box in the loop diagram: dark for the warehouse and the customer, mint for the steps of the return channel. */
function Node({ title, text, dark, mint }: { title: string; text: string; dark?: boolean; mint?: boolean }) {
  return (
    <div className={`flex min-w-[9.5rem] flex-1 flex-col rounded-[9px] border p-4 ${dark ? `border-transparent ${GREEN}` : mint ? "border-[#b7dccf] bg-[#DEF4EE]" : "border-[#174538]/15 bg-[#FFFEF6]"}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className={`mt-1.5 text-xs leading-relaxed ${dark ? "opacity-85" : "text-[#355E3B]"}`}>{text}</p>
    </div>
  );
}

function Arrow({ dashed }: { dashed?: boolean }) {
  return <span aria-hidden className={`hidden shrink-0 self-center text-lg text-[#355E3B] md:block ${dashed ? "opacity-70" : ""}`}>{dashed ? "⇢" : "→"}</span>;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const sp = await searchParams;
  const { user, method, presetKey, cfg, model, orgs, orgId, rows, scored, qs, hasCustom, t, f } = await loadContext(sp);

  // Live numbers from the engine
  const s = settingsFromConfig(cfg);
  const q1 = s.recoveryIfReturned;
  const q0 = method === "dropoff" ? s.recoveryIfKeptDropoff : s.recoveryIfKeptCourier;
  const bom: number = cfg.logistics.failed_delivery_rate.value;
  const pack: number = cfg.packaging.reusable_pack_vnd.value;
  const design: number = cfg.packaging.reuse_cycles.value;
  const cleaning: number = cfg.packaging.cleaning_per_reuse_vnd.value;
  const mailer: number = cfg.packaging.single_use_mailer_vnd.value;
  const pickupFee: number = cfg.logistics.ghn_tariff_vnd.value.noi_tinh * cfg.logistics.pickup_order_share.value;

  const reusable = scored.filter((x) => x.r.recommendation === "REUSABLE");
  const basis = reusable.length ? reusable : scored; // no Reusable orders yet: show all orders instead
  const recovery = mean(basis.map((x) => x.r.packReturnProb));
  const trips = (rate: number) => Math.min(design, 1 / (1 - Math.min(0.99, Math.max(0, rate))));
  const eff = trips(recovery);
  const lostPer1000 = mean(basis.map((x) => x.lostProb)) * 1000;
  const reusableShare = scored.length ? reusable.length / scored.length : 0;

  // Reusable cheaper than single-use, under each way of getting packs back
  const other = method === "dropoff" ? "courier_pickup" : "dropoff";
  const altScored = scoreAll(rows, cfg, other, model);
  const cheaper = (list: Scored[]) => (list.length ? list.filter((x) => x.r.expCostReusableVnd < x.r.expCostSingleVnd).length / list.length : 0);
  const cheaperCourier = cheaper(method === "courier_pickup" ? scored : altScored);

  // Simple per-trip view (pack share + cleaning + return channel); handling and tracking are not in the data yet
  // Only packs that do not ride back with a returned item (or a refused parcel) need a pickup, so the fee counts as an expected cost
  const channel = method === "courier_pickup" ? mean(basis.map((x) => (1 - bom) * (1 - x.r.predReturnProb) * q0)) * pickupFee : 0;
  const parts = [
    { name: t("Pack, spread over its real trips", "Túi, chia cho số chuyến thực tế"), v: pack / eff, color: BAND.reusable },
    { name: t("Cleaning", "Vệ sinh"), v: cleaning, color: TEAL },
    { name: t("Return channel (expected pickup cost)", "Kênh thu hồi (chi phí lấy hàng dự kiến)"), v: channel, color: TEAL_LIGHT },
  ];
  const perTrip = parts.reduce((a, p) => a + p.v, 0);
  const perUseDesign = pack / design + cleaning;

  // Fleet size
  const dailyDigits = Number((sp.daily ?? "").replace(/[^\d]/g, ""));
  const daily = dailyDigits > 0 ? Math.min(10_000_000, dailyDigits) : DEFAULT_DAILY;
  const daysRaw = Number(sp.days);
  const days = Number.isFinite(daysRaw) && daysRaw >= 1 ? Math.min(MAX_DAYS, Math.round(daysRaw)) : DEFAULT_DAYS;
  const reusablePerDay = daily * reusableShare;
  const fleet = reusablePerDay * days;

  const rates = [0.5, 0.67, 0.8, 0.9, 0.95];
  const rateRows = [...new Set([...rates, Math.round(recovery * 100) / 100])].sort((a, b) => a - b);

  const channels: { title: string; text: string; tag: ReactNode }[] = [
    { title: t("With the product return", "Cùng lúc hoàn sản phẩm"), text: t("No extra trip if the customer puts the bag back in the parcel.", "Không thêm chuyến nếu khách bỏ túi lại vào kiện hàng."), tag: <Tag tone="ok">{t("No extra trip", "Không thêm chuyến")}</Tag> },
    { title: t("Rejected delivery", "Giao hàng bị từ chối"), text: t(`The carrier returns the parcel free, with the pack unopened. About ${f.pct(bom)} of orders (8–12%).`, `Đơn vị vận chuyển hoàn kiện miễn phí, bao bì còn nguyên. Khoảng ${f.pct(bom)} số đơn (8–12%).`), tag: <Tag tone="ok">{t("Free return", "Hoàn miễn phí")}</Tag> },
    { title: t("Exchange trip", "Chuyến đổi hàng"), text: t("Coolmate's shipper already visits the customer, so the pack can ride back.", "Shipper của Coolmate đã đến nhà khách nên có thể mang túi về."), tag: <Tag tone="ok">{t("Shipper already visits", "Shipper đã đến sẵn")}</Tag> },
    { title: t("Store drop-off or next delivery", "Gửi tại cửa hàng hoặc ở lần giao sau"), text: t("The customer brings the pack back, with a CoolCash incentive.", "Khách mang bao bì đến trả, kèm ưu đãi CoolCash."), tag: <Tag tone="info">{t("Incentive", "Ưu đãi")}</Tag> },
    { title: t("Courier pickup", "Shipper đến lấy"), text: t(`A courier collects the empty pack for about ${f.vnd(pickupFee)}. It only pays for box-shipped orders; in this data set reusable is cheaper in ${f.pct(cheaperCourier)} of orders with courier pickup.`,
      `Shipper đến lấy bao bì rỗng với phí khoảng ${f.vnd(pickupFee)}. Chỉ có lợi cho các đơn gửi bằng hộp; trong bộ dữ liệu này tái sử dụng rẻ hơn ở ${f.pct(cheaperCourier)} số đơn khi shipper đến lấy.`), tag: <Tag tone="warn">{f.vnd(pickupFee)} {t("per pack", "mỗi bao bì")}</Tag> },
  ];

  return (
    <AppShell qs={qs} email={user?.email}
      footerNote={t("Return channels are options to validate in the pilot.", "Các kênh thu hồi là phương án cần kiểm chứng trong thí điểm.")}>
      <SettingsBar targetId="settings-panel" changeLabel={t("Change settings", "Đổi cài đặt")} items={settingsItems(t, orgs, orgId, presetKey, method)} />
      <PageTitle title={t("Pack recovery", "Thu hồi bao bì")}
        sub={t("A reusable pack only pays off if it comes back. This is how products and packs travel on separate loops, which return channels bring packs back cheaply, and what it costs when they do not.",
          "Túi tái sử dụng chỉ có lợi khi quay về được. Đây là cách sản phẩm và bao bì chạy trên hai vòng riêng, những kênh thu hồi nào đưa bao bì về với chi phí thấp, và chi phí phát sinh khi chúng không quay về.")} />

      <div id="settings-panel" className="rl-rise relative z-20 mt-6" style={rise(1)}>
        <Controls method={method} presetKey={presetKey} orgId={orgId} orgs={orgs} hasCustom={hasCustom} action="/recovery" />
      </div>

      {/* Live numbers */}
      <div className="rl-rise mt-5" style={rise(2)}>
        <div className="grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-2 xl:grid-cols-4">
          <Stat layout="cell" variant="green" label={t("Chance a pack comes back", "Khả năng bao bì quay về")} value={f.pct(recovery)}
            note={t(`average over ${reusable.length ? "Reusable orders" : "all orders"} · ${methodLabel(t, method).toLowerCase()}`, `trung bình ${reusable.length ? "các đơn Reusable" : "mọi đơn"} · ${methodLabel(t, method).toLowerCase()}`)} />
          <Stat layout="cell" label={t("Average trips per bag", "Số chuyến trung bình mỗi túi")} value={f.n(eff, 1)}
            note={t(`design life is ${f.n(design)} uses`, `vòng đời thiết kế là ${f.n(design)} lần dùng`)} />
          <Stat layout="cell" label={t("Reusable orders", "Đơn Reusable")} value={f.pct(reusableShare)}
            note={t(`${f.n(reusable.length)} of ${f.n(scored.length)} orders`, `${f.n(reusable.length)} trên ${f.n(scored.length)} đơn`)} />
          <Stat layout="cell" label={t("Bags expected lost", "Túi dự kiến bị mất")} value={f.n(Math.round(lostPer1000))}
            note={t("per 1,000 orders shipped in a reusable bag", "trên 1.000 đơn gửi bằng túi tái sử dụng")} />
        </div>
      </div>

      {/* The two loops */}
      <Section title={t("Two loops, one pack", "Hai vòng, một túi")}
        sub={t("Products and packs run on separate loops. Packs return by the cheapest channel.", "Sản phẩm và bao bì chạy trên hai vòng riêng. Bao bì quay về qua kênh rẻ nhất.")} i={3}>
        <div className="space-y-5">
          <div className={CARD}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#355E3B]">{t("Forward loop", "Vòng đi")}</p>
            <div className="flex flex-col gap-3 md:flex-row">
              <Node dark title={t("Warehouse", "Kho")} text={t("Hanoi / HCMC centre. Reusable pack stock.", "Trung tâm Hà Nội / TP.HCM. Kho túi tái sử dụng.")} />
              <Arrow />
              <Node title={t("RVS decision", "Quyết định RVS")} text={t(`≥ ${s.reusableMin} Reusable; ${s.reviewMin}–${s.reusableMin - 1} Review; < ${s.reviewMin} Single-use.`, `≥ ${s.reusableMin} Reusable; ${s.reviewMin}–${s.reusableMin - 1} Review; < ${s.reviewMin} Single-use.`)} />
              <Arrow />
              <Node title={t("Pack & ship", "Đóng gói & giao")} text={t("Bag vs brand mailer or box. Link pack ID ↔ order.", "Túi hay túi in thương hiệu hoặc hộp. Gắn mã bao bì ↔ đơn hàng.")} />
              <Arrow />
              <Node dark title={t("Customer", "Khách hàng")} text={t("Decides on the product and the pack separately.", "Quyết định về sản phẩm và bao bì riêng biệt.")} />
            </div>
          </div>
          <div className={CARD}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#355E3B]">{t("Reverse loop", "Vòng về")}</p>
            <div className="flex flex-col gap-3 md:flex-row">
              <Node dark title={t("Customer", "Khách hàng")} text={t("Keeps the product, returns it, or never sends the pack back.", "Giữ sản phẩm, hoàn sản phẩm, hoặc không gửi trả túi.")} />
              <Arrow dashed />
              <Node mint title={t("Return channel", "Kênh thu hồi")} text={t("Cheapest first. Scan in.", "Rẻ nhất trước. Quét nhập kho.")} />
              <Arrow dashed />
              <Node mint title={t("Inspect & clean", "Kiểm tra & vệ sinh")} text={t("With the product inspection. Grade A / B / C.", "Cùng lúc kiểm tra sản phẩm. Phân loại A / B / C.")} />
              <Arrow dashed />
              <Node dark title={t("Warehouse", "Kho")} text={t("Back in stock, ready for the next order.", "Nhập lại kho, sẵn sàng cho đơn tiếp theo.")} />
            </div>
          </div>
          <p className="text-xs leading-relaxed text-[#355E3B]">
            {t("Review: single-use by default; switches to reusable only to fill a management target, cheapest-saving orders first. ", "Review: mặc định dùng một lần; chỉ chuyển sang tái sử dụng để đạt mục tiêu của ban quản lý, đơn tiết kiệm được nhiều nhất trước. ")}
            <Link href={`/orders${qs}`} className={LINK}>{t("Open the Review queue", "Mở hàng đợi Review")}</Link>
          </p>
        </div>
      </Section>

      {/* Return channels */}
      <Section title={t("Return channels", "Kênh thu hồi")}
        sub={t("Five ways a pack can come back, cheapest first.", "Năm cách để bao bì quay về, rẻ nhất trước.")} i={4}>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((c, i) => (
            <div key={c.title} className={`${CARD} flex flex-col ${i === 4 ? "md:col-span-2 xl:col-span-1" : ""}`}>
              <div className="flex items-start justify-between gap-3"><StepNo n={i + 1} />{c.tag}</div>
              <h3 className="mt-3 font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#355E3B]">{c.text}</p>
            </div>
          ))}
        </div>
        <Notice tone="info" className="mt-5">
          {t("These are options to validate in the pilot. How many packs come back without a courier is the key unknown of the pilot: set your assumption under ",
            "Đây là các phương án cần kiểm chứng trong thí điểm. Số bao bì quay về mà không cần shipper là ẩn số chính của thí điểm: hãy đặt giả định của bạn tại ")}
          <Link href={`/settings${qs}`} className={LINK}>{t("Cost settings", "Cài đặt chi phí")}</Link>.
        </Notice>
      </Section>

      {/* Product return is not packaging return */}
      <Section title={t("Product return ≠ packaging return", "Hoàn sản phẩm ≠ hoàn bao bì")}
        sub={t("A customer can send the product back and keep the bag, or the other way round.", "Khách có thể hoàn sản phẩm mà giữ lại túi, hoặc ngược lại.")} i={5}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className={CARD}>
            <h3 className="font-semibold">{t("Product return", "Hoàn sản phẩm")}</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#355E3B]">
              <li>{t("Coolmate: 60 days, at most 3 times per order, courier collects.", "Coolmate: 60 ngày, tối đa 3 lần mỗi đơn, shipper đến lấy.")}</li>
              <li>{t("An exchange is a new shipment and a new pack decision.", "Đổi hàng là một lô giao mới và một quyết định bao bì mới.")}</li>
              <li>{t("Tracked by order ID.", "Theo dõi theo mã đơn hàng.")}</li>
            </ul>
          </div>
          <div className={CARD}>
            <h3 className="font-semibold">{t("Packaging return", "Hoàn bao bì")}</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#355E3B]">
              <li>{t("Not guaranteed with the product return: the bag may be kept.", "Không được đảm bảo khi hoàn sản phẩm: khách có thể giữ lại túi.")}</li>
              <li>{t("Has its own status and cut-off.", "Có trạng thái và hạn chốt riêng.")}</li>
              <li>{t("Tracked by pack ID, with no link to the refund.", "Theo dõi theo mã bao bì, không gắn với hoàn tiền.")}</li>
            </ul>
          </div>
        </div>
        <div className={`${CARD} mt-6`}>
          <p className="text-center text-sm font-semibold">{t("Independent outcomes", "Các kết quả độc lập")}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              [t("Keep product + return pack", "Giữ sản phẩm + hoàn bao bì"), t("Needs a no-courier channel", "Cần kênh không qua shipper"), "info"],
              [t("Return product + return pack", "Hoàn sản phẩm + hoàn bao bì"), t("One trip, two records, pack free", "Một chuyến, hai bản ghi, bao bì miễn phí"), "ok"],
              [t("Return product + keep pack", "Hoàn sản phẩm + giữ bao bì"), t("Refund OK, pack unrecovered", "Hoàn tiền bình thường, bao bì không thu hồi được"), "warn"],
              [t("Keep both", "Giữ cả hai"), t("Pack unrecovered", "Bao bì không thu hồi được"), "warn"],
            ].map(([title, text, tone]) => (
              <div key={title} className={`flex flex-col items-center justify-center rounded-[9px] border px-4 py-6 text-center ${tone === "ok" ? "border-[#b7dccf] bg-[#DEF4EE]" : tone === "warn" ? "border-[#174538]/25 bg-[#FFFDD0]" : "border-[#d4e3a9] bg-[#F5FBE2]"}`}>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-[#355E3B]">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-[#355E3B]">
          {t(`In the model: a pack comes back ${f.pct(q1)} of the time when the product is returned, and ${f.pct(q0)} when it is kept (${methodLabel(t, method).toLowerCase()}). Refused deliveries (${f.pct(bom)}) always bring the pack back.`,
            `Trong mô hình: bao bì quay về ${f.pct(q1)} khi sản phẩm bị hoàn và ${f.pct(q0)} khi sản phẩm được giữ lại (${methodLabel(t, method).toLowerCase()}). Đơn bị từ chối nhận (${f.pct(bom)}) luôn mang bao bì về.`)}
        </p>
      </Section>

      {/* Damaged vs lost */}
      <Section title={t("Damaged vs lost packaging", "Bao bì hư hỏng và bao bì thất lạc")} i={6}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-[9px] border border-[#d4e3a9] bg-[#F5FBE2] p-5">
            <p className="flex items-center gap-2 font-semibold"><Dot color={BAND.review} />{t("Damaged: the pack came back", "Hư hỏng: bao bì đã quay về")}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              <li>{t("Found at inspection.", "Phát hiện khi kiểm tra.")}</li>
              <li>{t("Grade A: back to stock.", "Loại A: nhập lại kho.")}</li>
              <li>{t("Grade B: repair, then stock.", "Loại B: sửa rồi nhập kho.")}</li>
              <li>{t("Grade C: retire, then recycling.", "Loại C: loại bỏ, chuyển tái chế.")}</li>
              <li>{t("Log a reason code.", "Ghi mã lý do.")}</li>
            </ul>
          </div>
          <div className="rounded-[9px] border border-[#174538]/25 bg-[#FFFDD0] p-5">
            <p className="flex items-center gap-2 font-semibold"><Dot color={BAND.single} />{t("Lost: the pack never came back", "Thất lạc: bao bì không quay về")}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              <li>{t("No scan-in by the cut-off: provisional loss.", "Không quét nhập kho đến hạn chốt: ghi nhận tạm thời.")}</li>
              <li>{t("Final write-off after the 60-day window.", "Xóa sổ chính thức sau thời hạn 60 ngày.")}</li>
              <li>{t("Log it to the order, then use it to retrain the AI.", "Ghi vào đơn hàng, rồi dùng để huấn luyện lại AI.")}</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* IE view */}
      <Section title={t("Why losses matter", "Vì sao thất lạc quan trọng")}
        sub={t("The industrial-engineering view: what a bag really earns, and how many bags the loop ties up.", "Góc nhìn kỹ thuật công nghiệp: một chiếc túi thực sự mang lại gì, và vòng lặp giữ bao nhiêu túi.")} i={7}>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className={CARD}>
            <h3 className="font-semibold">{t("Effective cycles", "Số chuyến thực tế")}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#355E3B]">{t("Trips ≈ 1 ÷ (1 − recovery rate), up to the design life. About 3 trips at 67%, not the 10-use design life.", "Số chuyến ≈ 1 ÷ (1 − tỷ lệ thu hồi), tối đa bằng vòng đời thiết kế. Khoảng 3 chuyến ở mức 67%, không phải vòng đời thiết kế 10 lần.")}</p>
            <div className={`${TABLE_BOX} mt-4`}>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#174538]/15"><th className={TH}>{t("Packs come back", "Bao bì quay về")}</th><th className={TH}>{t("Average trips", "Số chuyến trung bình")}</th></tr></thead>
                <tbody>
                  {rateRows.map((r) => {
                    const mine = Math.abs(r - Math.round(recovery * 100) / 100) < 0.001;
                    return (
                      <tr key={r} className={`${TR} ${mine ? "bg-[#FFFEF6] font-semibold" : ""}`}>
                        <td className="px-4 py-2.5">{Math.round(r * 100)}%{mine ? ` · ${t("this data set", "bộ dữ liệu này")}` : ""}</td>
                        <td className="px-4 py-2.5">{f.n(trips(r), 1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={CARD}>
            <h3 className="font-semibold">{t("Cost per trip", "Chi phí mỗi chuyến")}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#355E3B]">{t("Cost per trip = pack ÷ effective cycles + handling + tracking + return channel.", "Chi phí mỗi chuyến = túi ÷ số chuyến thực tế + xử lý + theo dõi + kênh thu hồi.")}</p>
            <div className="mt-4 flex h-3 overflow-hidden rounded-[2px] bg-[#d0f0e7]" role="img" aria-label={f.vnd(perTrip)}>
              {parts.map((p) => <div key={p.name} style={{ width: `${(p.v / Math.max(perTrip, mailer)) * 100}%`, background: p.color }} />)}
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {parts.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Dot color={p.color} />{p.name}</span><b>{f.vnd(p.v)}</b></li>
              ))}
              <li className="flex items-center justify-between gap-3 text-[#355E3B]"><span className="pl-[18px]">{t("Handling and tracking", "Xử lý và theo dõi")}</span><span className="text-xs">{t("not in the data yet", "chưa có trong dữ liệu")}</span></li>
            </ul>
            <p className="mt-4 flex items-baseline justify-between gap-3 border-t border-[#174538]/10 pt-3 text-sm">
              <span className="text-[#355E3B]">{t(`Per trip, vs ${f.vnd(mailer)} for a single-use mailer`, `Mỗi chuyến, so với ${f.vnd(mailer)} cho một túi gói hàng dùng một lần`)}</span>
              <b className="text-xl font-medium">{f.vnd(perTrip)}</b>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#355E3B]">
              {t(`At the design life the same bag would cost ${f.vnd(perUseDesign)} per use. The score uses a fuller expected cost that also counts the chance of losing the bag.`,
                `Ở vòng đời thiết kế, cùng chiếc túi đó tốn ${f.vnd(perUseDesign)} mỗi lần dùng. Điểm số dùng chi phí dự kiến đầy đủ hơn, có tính cả khả năng mất túi.`)}
            </p>
          </div>
        </div>

        <div className={`${CARD} mt-5`}>
          <h3 className="font-semibold">{t("Fleet size", "Quy mô đội túi")}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[#355E3B]">{t("Reusable orders per day × days a bag spends in the loop (up to the 60-day return window).", "Số đơn tái sử dụng mỗi ngày × số ngày một túi nằm trong vòng lặp (tối đa bằng thời hạn hoàn hàng 60 ngày).")}</p>
          <SoftForm action="/recovery" className="mt-4 flex flex-wrap items-end gap-4">
            <input type="hidden" name="method" value={method} /><input type="hidden" name="preset" value={presetKey} /><input type="hidden" name="org" value={orgId} />
            <Field label={t("Orders per day", "Số đơn mỗi ngày")} className="min-w-[11rem] flex-1">
              <NumberInput name="daily" defaultValue={daily} min={1} max={10000000} suffix={t("orders", "đơn")} />
            </Field>
            <Field label={t("Days in the loop", "Số ngày trong vòng lặp")} className="min-w-[11rem] flex-1">
              <NumberInput name="days" defaultValue={days} min={1} max={MAX_DAYS} suffix={t("days", "ngày")} />
            </Field>
            <button className={BTN_PRIMARY}>{t("Calculate", "Tính")}</button>
            {(daily !== DEFAULT_DAILY || days !== DEFAULT_DAYS) && <Link href={`/recovery${qs}`} className={BTN_OUTLINE}>{t("Reset", "Đặt lại")}</Link>}
          </SoftForm>
          <div className="mt-5 grid gap-px overflow-hidden rounded-[9px] border border-[#174538]/15 bg-[#174538]/15 sm:grid-cols-2 xl:grid-cols-4">
            <Stat layout="cell" label={t("Reusable orders per day", "Đơn tái sử dụng mỗi ngày")} value={f.n(Math.round(reusablePerDay))} note={`${f.pct(reusableShare)} ${t("of", "của")} ${f.n(daily)}`} />
            <Stat layout="cell" variant="green" label={t("Bags in the loop", "Số túi trong vòng lặp")} value={f.n(Math.round(fleet))} note={t(`${f.n(days)} days in the loop`, `${f.n(days)} ngày trong vòng lặp`)} />
            <Stat layout="cell" label={t("Money tied up in bags", "Vốn nằm trong túi")} value={f.vnd(fleet * pack)} note={`${f.vnd(pack)} ${t("per bag", "mỗi túi")}`} />
            <Stat layout="cell" label={t("New bags needed per day", "Túi mới cần mỗi ngày")} value={f.n(Math.round(reusablePerDay / eff))} note={t("to replace worn-out and lost bags", "để thay túi hết vòng đời và túi bị mất")} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#355E3B]">
            {t(`Illustrative: ${f.n(DEFAULT_DAILY)} orders a day is Coolmate's volume in the team's plan. Handling labour and tracking cost are not included yet.`,
              `Minh họa: ${f.n(DEFAULT_DAILY)} đơn mỗi ngày là quy mô của Coolmate trong kế hoạch của đội. Chưa tính chi phí nhân công xử lý và theo dõi.`)}
          </p>
        </div>
      </Section>
    </AppShell>
  );
}
