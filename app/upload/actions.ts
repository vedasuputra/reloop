"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/csv";

const REQUIRED = [
  "order_id", "customer_id", "category", "quantity_of_item", "order_value_vnd",
  "payment_method", "estimated_delivery_distance_km",
] as const;
const MAX_ROWS = 5000;

function back(orgId: string, msg: string, ok = false) {
  redirect(`/upload?org=${orgId}&${ok ? "ok" : "error"}=${encodeURIComponent(msg)}`);
}

export async function uploadCsv(formData: FormData) {
  const orgId = String(formData.get("org") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) back(orgId, "Pilih file CSV dulu.");
  const supabase = await createClient();

  // Only owners/editors of this organisation may upload (RLS checks this again on insert).
  const { data: me } = await supabase.from("members").select("role").eq("org_id", orgId).maybeSingle();
  if (!me || !["owner", "editor"].includes(me.role)) back(orgId, "Kamu tidak punya izin upload ke data ini.");

  const table = parseCsv(await (file as File).text());
  if (table.length < 2) back(orgId, "File kosong atau hanya berisi judul kolom.");
  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) back(orgId, `Kolom wajib tidak ada: ${missing.join(", ")}. Pakai template CSV.`);
  if (table.length - 1 > MAX_ROWS) back(orgId, `Maksimal ${MAX_ROWS} order per upload.`);

  const col = (r: string[], name: string) => {
    const i = header.indexOf(name);
    return i < 0 ? "" : (r[i] ?? "").trim();
  };
  const num = (v: string, dflt: number | null) => {
    if (v === "") return dflt;
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  };
  const yesNo = (v: string) => (["1", "yes", "ya", "true", "y"].includes(v.toLowerCase()) ? 1 : 0);

  const errors: string[] = [];
  const records = table.slice(1).map((r, idx) => {
    const line = idx + 2;
    const rec = {
      org_id: orgId,
      order_id: col(r, "order_id"),
      customer_id: col(r, "customer_id"),
      address: col(r, "address") || null,
      order_date: col(r, "order_date") || null,
      category: col(r, "category"),
      quantity_of_item: num(col(r, "quantity_of_item"), null),
      order_value_vnd: num(col(r, "order_value_vnd"), null),
      multi_size: yesNo(col(r, "multi_size")),
      payment_method: col(r, "payment_method"),
      voucher_used: yesNo(col(r, "voucher_used")),
      estimated_delivery_distance_km: num(col(r, "estimated_delivery_distance_km"), null),
      order_status: col(r, "order_status") || "Delivered",
      past_delivered_in_data: num(col(r, "past_delivered_in_data"), 0),
      customer_return_rate_in_data: num(col(r, "customer_return_rate_in_data"), null),
      was_returned: num(col(r, "was_returned"), null),
      data_source: "uploaded",
    };
    for (const k of ["order_id", "customer_id", "category", "payment_method"] as const)
      if (!rec[k]) errors.push(`Baris ${line}: ${k} kosong.`);
    for (const k of ["quantity_of_item", "order_value_vnd", "estimated_delivery_distance_km",
      "past_delivered_in_data", "customer_return_rate_in_data", "was_returned"] as const)
      if (Number.isNaN(rec[k] as number)) errors.push(`Baris ${line}: ${k} harus berupa angka.`);
    if (rec.quantity_of_item === null) errors.push(`Baris ${line}: quantity_of_item kosong.`);
    if (rec.estimated_delivery_distance_km === null) errors.push(`Baris ${line}: estimated_delivery_distance_km kosong.`);
    if (rec.order_date && !/^\d{4}-\d{2}-\d{2}$/.test(rec.order_date))
      errors.push(`Baris ${line}: order_date harus berformat YYYY-MM-DD.`);
    return rec;
  });
  if (errors.length) back(orgId, errors.slice(0, 5).join(" ") + (errors.length > 5 ? ` (+${errors.length - 5} kesalahan lain)` : ""));

  // Replace this organisation's previous upload, then insert in chunks.
  if (formData.get("replace") === "on") {
    const { error } = await supabase.from("orders").delete().eq("org_id", orgId);
    if (error) back(orgId, "Gagal menghapus data lama: " + error.message);
  }
  for (let i = 0; i < records.length; i += 500) {
    const { error } = await supabase.from("orders").insert(records.slice(i, i + 500));
    if (error) back(orgId, `Gagal menyimpan (mulai baris ${i + 2}): ${error.message}`);
  }
  back(orgId, `${records.length} order berhasil diupload. Buka Dashboard dan pilih data ini.`, true);
}

export async function clearOrders(formData: FormData) {
  const orgId = String(formData.get("org") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("orders").delete().eq("org_id", orgId);
  if (error) back(orgId, "Gagal menghapus: " + error.message);
  back(orgId, "Semua order di data ini sudah dihapus.", true);
}
