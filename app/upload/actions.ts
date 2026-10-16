"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/csv";
import { getT } from "@/lib/i18n";

const REQUIRED = [
  "order_id", "customer_id", "category", "quantity_of_item", "order_value_vnd",
  "payment_method", "estimated_delivery_distance_km",
] as const;
const MAX_ROWS = 5000;

function back(orgId: string, msg: string, ok = false) {
  redirect(`/upload?org=${orgId}&${ok ? "ok" : "error"}=${encodeURIComponent(msg)}`);
}

export async function uploadCsv(formData: FormData) {
  const { t } = await getT();
  const orgId = String(formData.get("org") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) back(orgId, t("Choose a CSV file first.", "Hãy chọn tệp CSV trước."));
  const supabase = await createClient();

  // Only owners/editors of this organisation may upload (RLS checks this again on insert).
  const { data: me } = await supabase.from("members").select("role").eq("org_id", orgId).maybeSingle();
  if (!me || !["owner", "editor"].includes(me.role)) back(orgId, t("You don't have permission to upload to this data set.", "Bạn không có quyền tải lên bộ dữ liệu này."));

  const table = parseCsv(await (file as File).text());
  if (table.length < 2) back(orgId, t("The file is empty or only has column headers.", "Tệp trống hoặc chỉ có tiêu đề cột."));
  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) back(orgId, t(`Required columns missing: ${missing.join(", ")}. Use the CSV template.`, `Thiếu cột bắt buộc: ${missing.join(", ")}. Hãy dùng mẫu CSV.`));
  if (table.length - 1 > MAX_ROWS) back(orgId, t(`At most ${MAX_ROWS} orders per upload.`, `Tối đa ${MAX_ROWS} đơn mỗi lần tải lên.`));

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
      if (!rec[k]) errors.push(t(`Row ${line}: ${k} is empty.`, `Dòng ${line}: ${k} đang trống.`));
    for (const k of ["quantity_of_item", "order_value_vnd", "estimated_delivery_distance_km",
      "past_delivered_in_data", "customer_return_rate_in_data", "was_returned"] as const)
      if (Number.isNaN(rec[k] as number)) errors.push(t(`Row ${line}: ${k} must be a number.`, `Dòng ${line}: ${k} phải là số.`));
    if (rec.quantity_of_item === null) errors.push(t(`Row ${line}: quantity_of_item is empty.`, `Dòng ${line}: quantity_of_item đang trống.`));
    if (rec.estimated_delivery_distance_km === null) errors.push(t(`Row ${line}: estimated_delivery_distance_km is empty.`, `Dòng ${line}: estimated_delivery_distance_km đang trống.`));
    if (rec.order_date && !/^\d{4}-\d{2}-\d{2}$/.test(rec.order_date))
      errors.push(t(`Row ${line}: order_date must use the format YYYY-MM-DD.`, `Dòng ${line}: order_date phải có định dạng YYYY-MM-DD.`));
    return rec;
  });
  if (errors.length) back(orgId, errors.slice(0, 5).join(" ") + (errors.length > 5 ? t(` (+${errors.length - 5} more errors)`, ` (+${errors.length - 5} lỗi khác)`) : ""));

  // Replace this organisation's previous upload, then insert in chunks.
  if (formData.get("replace") === "on") {
    const { error } = await supabase.from("orders").delete().eq("org_id", orgId);
    if (error) back(orgId, t("Could not delete the old data: ", "Không xóa được dữ liệu cũ: ") + error.message);
  }
  for (let i = 0; i < records.length; i += 500) {
    const { error } = await supabase.from("orders").insert(records.slice(i, i + 500));
    if (error) back(orgId, t(`Could not save (from row ${i + 2}): ${error.message}`, `Không lưu được (từ dòng ${i + 2}): ${error.message}`));
  }
  back(orgId, t(`${records.length} orders uploaded. Open the Dashboard and choose this data set.`, `Đã tải lên ${records.length} đơn. Mở Tổng quan và chọn bộ dữ liệu này.`), true);
}

export async function clearOrders(formData: FormData) {
  const { t } = await getT();
  const orgId = String(formData.get("org") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("orders").delete().eq("org_id", orgId);
  if (error) back(orgId, t("Could not delete: ", "Không xóa được: ") + error.message);
  back(orgId, t("All orders in this data set have been deleted.", "Đã xóa toàn bộ đơn hàng trong bộ dữ liệu này."), true);
}
