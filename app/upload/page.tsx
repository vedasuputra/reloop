import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { getOrgs } from "@/lib/context";
import { uploadCsv, clearOrders } from "./actions";

type SP = { org?: string; ok?: string; error?: string };

export default function Upload({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const own = (await getOrgs()).filter((o) => o.role === "owner" || o.role === "editor");
  const org = own.find((o) => o.id === sp.org) ?? own[0];
  const { count } = org
    ? await supabase.from("orders").select("*", { count: "exact", head: true }).eq("org_id", org.id)
    : { count: 0 };

  return (
    <>
      <Nav qs={org ? `?org=${org.id}` : ""} email={user?.email} />
      <h1 className="text-2xl font-bold mb-3">Upload CSV</h1>
      {sp.ok && <p className="text-green-500 text-sm mb-3">{sp.ok}</p>}
      {sp.error && <p className="text-red-500 text-sm mb-3">{sp.error}</p>}

      {!org ? (
        <p>Akun ini belum punya data sendiri untuk diupload.</p>
      ) : (
        <>
          <p className="text-sm mb-4">
            Data tujuan: <b>{org.name}</b>, saat ini berisi {count ?? 0} order. Data demo tidak akan berubah.
          </p>
          <form action={uploadCsv} className="space-y-3 rounded border p-4 text-sm">
            <input type="hidden" name="org" value={org.id} />
            <input type="file" name="file" accept=".csv,text/csv" required />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="replace" defaultChecked /> Ganti order yang sudah ada
            </label>
            <button className="rounded border px-3 py-1">Upload</button>
          </form>

          <h2 className="font-semibold mt-6 mb-2">Format file</h2>
          <p className="text-sm">
            Unduh <a className="underline" href="/template_orders.csv">template CSV</a>, isi dengan data order, lalu upload.
            Maksimal 5.000 order per upload.
          </p>
          <ul className="text-sm list-disc pl-5 mt-2">
            <li>Wajib: order_id, customer_id, category, quantity_of_item, order_value_vnd, payment_method, estimated_delivery_distance_km</li>
            <li>Opsional: address, order_date (YYYY-MM-DD), multi_size (1/0), voucher_used (1/0), order_status (default Delivered),
              past_delivered_in_data, customer_return_rate_in_data (0-1), was_returned (1/0)</li>
            <li>payment_method: tulis COD untuk bayar di tempat. Kategori yang dikenali model: Accessories, Activewear, Dress, Jeans, Outerwear, Shirt, T-shirt, Trousers.</li>
          </ul>

          <form action={clearOrders} className="mt-6">
            <input type="hidden" name="org" value={org.id} />
            <button className="text-sm underline text-red-500">Hapus semua order di {org.name}</button>
          </form>
          <p className="mt-6 text-sm"><Link className="underline" href={`/?org=${org.id}`}>Lihat hasilnya di Dashboard</Link></p>
        </>
      )}
    </>
  );
}
