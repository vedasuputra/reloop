import { scoreOrder, type Config, type Model, type Order } from "@/lib/rvs";
import configJson from "@/data/config.json";
import modelJson from "@/data/return_model.json";

const cfg = configJson as unknown as Config;
const model = modelJson as unknown as Model;

const contoh: Order = {
  category: "Dress",
  payment_method: "COD",
  multi_size: 1,
  voucher_used: 0,
  quantity_of_item: 1,
  past_delivered_in_data: 3,
  customer_return_rate_in_data: 0.33,
  estimated_delivery_distance_km: 12,
};

export default function Home() {
  const kurir = scoreOrder(cfg, model, contoh, "courier_pickup");
  const dropoff = scoreOrder(cfg, model, contoh, "dropoff");

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">ReLoop AI</h1>
      <p className="text-sm text-gray-500">Data simulasi. Tes RVS v2 untuk satu order contoh.</p>
      {[["Dijemput kurir", kurir], ["Drop-off", dropoff]].map(([label, r]: any) => (
        <section key={label} className="rounded border p-4">
          <h2 className="font-semibold">{label}</h2>
          <p>Peluang retur: {Math.round(r.predReturnProb * 100)}%</p>
          <p>RVS: {r.rvs.toFixed(1)}: <b>{r.recommendation}</b></p>
          <p className="text-sm text-gray-500">{r.reason}</p>
        </section>
      ))}
    </main>
  );
}