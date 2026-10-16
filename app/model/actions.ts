"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchOrders, trainingRows } from "@/lib/data";
import { trainModel, cannotTrain } from "@/lib/train";

function back(orgId: string, key: "ok" | "error", msg: string) {
  redirect(`/model?org=${orgId}&${key}=${encodeURIComponent(msg)}`);
}

async function canEdit(orgId: string) {
  const supabase = await createClient();
  const { data: me } = await supabase.from("members").select("role").eq("org_id", orgId).maybeSingle();
  return !!me && ["owner", "editor"].includes(me.role);
}

/** Train a model on this organisation's own labelled orders and save it. */
export async function retrainModel(formData: FormData) {
  const orgId = String(formData.get("org") ?? "");
  if (!(await canEdit(orgId))) back(orgId, "error", "Kamu tidak punya izin melatih model untuk data ini. Pilih \"Data saya\".");
  const rows = trainingRows(await fetchOrders(orgId));
  const why = cannotTrain(rows);
  if (why) back(orgId, "error", why);
  const m = trainModel(rows);
  const supabase = await createClient();
  const { error } = await supabase.from("org_models")
    .upsert({ org_id: orgId, model: m, updated_at: new Date().toISOString() });
  if (error) back(orgId, "error", "Gagal menyimpan model: " + error.message);
  back(orgId, "ok", `Model baru tersimpan (AUC ${m.metrics.auc_model}, baseline ${m.metrics.auc_baseline_category_mean}). Semua layar sekarang memakai model ini untuk data ini.`);
}

/** Go back to the built-in model. */
export async function deleteModel(formData: FormData) {
  const orgId = String(formData.get("org") ?? "");
  if (!(await canEdit(orgId))) back(orgId, "error", "Kamu tidak punya izin mengubah model data ini.");
  const supabase = await createClient();
  const { error } = await supabase.from("org_models").delete().eq("org_id", orgId);
  if (error) back(orgId, "error", "Gagal menghapus model: " + error.message);
  back(orgId, "ok", "Kembali ke model bawaan.");
}
