import { getT } from "@/lib/i18n";
import type { RvsResult } from "@/lib/rvs";

/** Score table + expected costs, shared by Recommendation and Check One Order. */
export default async function ScoreBreakdown({ r, w, cycles, method }: {
  r: RvsResult; w: { cost: number; pack_return: number; cycles: number }; cycles: number; method: string;
}) {
  const { t, f } = await getT();
  const row = (name: string, score: number, weight: number) => (
    <tr className="border-b"><td>{name}</td><td>{f.n(score)}</td><td>{f.pct(weight)}</td><td>{f.n(weight * score, 1)}</td></tr>
  );
  return (
    <>
      <h2 className="font-semibold mt-6 mb-2">{t("Score breakdown", "Chi tiết điểm")}</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b">
          <th>{t("Factor", "Yếu tố")}</th><th>{t("Score (0-100)", "Điểm (0-100)")}</th><th>{t("Weight", "Trọng số")}</th><th>{t("Contribution", "Đóng góp")}</th>
        </tr></thead>
        <tbody>
          {row(t("Cost advantage", "Lợi thế chi phí"), r.scoreCost, w.cost)}
          {row(t(`Chance the pack comes back (${f.pct(r.packReturnProb)})`, `Khả năng bao bì quay về (${f.pct(r.packReturnProb)})`), r.scorePackReturn, w.pack_return)}
          {row(t(`Reuse cycles (${cycles} times)`, `Số vòng tái sử dụng (${cycles} lần)`), r.scoreCycles, w.cycles)}
        </tbody>
      </table>

      <h2 className="font-semibold mt-6 mb-2">{t("Expected packaging cost", "Chi phí bao bì dự kiến")}</h2>
      <ul className="text-sm list-disc pl-5">
        <li>{t("Single-use", "Dùng một lần")}: {f.vnd(r.expCostSingleVnd)}</li>
        <li>{t("Reusable", "Tái sử dụng")}: {f.vnd(r.expCostReusableVnd)}{" "}
          ({method === "dropoff"
            ? t("includes cleaning, return without a courier, and the risk of losing the pack", "gồm vệ sinh, khách tự gửi trả không cần shipper, và rủi ro mất bao bì")
            : t("includes cleaning, the courier pickup fee, and the risk of losing the pack", "gồm vệ sinh, phí shipper đến lấy, và rủi ro mất bao bì")})</li>
        <li>{t("Return probability", "Xác suất hoàn hàng")}: {f.pct(r.predReturnProb)}</li>
      </ul>
    </>
  );
}
