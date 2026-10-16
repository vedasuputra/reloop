"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchOrders, trainingRows } from "@/lib/data";
import { trainModel, cannotTrain } from "@/lib/train";
import { getT } from "@/lib/i18n";

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
  const { t } = await getT();
  const orgId = String(formData.get("org") ?? "");
  if (!(await canEdit(orgId)))
    back(orgId, "error", t("You don't have permission to train a model for this data set. Choose \"My data\".", "Bạn không có quyền huấn luyện mô hình cho bộ dữ liệu này. Hãy chọn \"Dữ liệu của tôi\"."));
  const rows = trainingRows(await fetchOrders(orgId));
  const why = cannotTrain(rows, t);
  if (why) back(orgId, "error", why);
  const m = trainModel(rows);
  const supabase = await createClient();
  const { error } = await supabase.from("org_models")
    .upsert({ org_id: orgId, model: m, updated_at: new Date().toISOString() });
  if (error) back(orgId, "error", t("Could not save the model: ", "Không lưu được mô hình: ") + error.message);
  back(orgId, "ok", t(
    `New model saved (AUC ${m.metrics.auc_model}, baseline ${m.metrics.auc_baseline_category_mean}). Every screen now uses this model for this data set.`,
    `Đã lưu mô hình mới (AUC ${m.metrics.auc_model}, mốc ${m.metrics.auc_baseline_category_mean}). Mọi màn hình giờ dùng mô hình này cho bộ dữ liệu này.`));
}

/** Go back to the built-in model. */
export async function deleteModel(formData: FormData) {
  const { t } = await getT();
  const orgId = String(formData.get("org") ?? "");
  if (!(await canEdit(orgId))) back(orgId, "error", t("You don't have permission to change this data set's model.", "Bạn không có quyền thay đổi mô hình của bộ dữ liệu này."));
  const supabase = await createClient();
  const { error } = await supabase.from("org_models").delete().eq("org_id", orgId);
  if (error) back(orgId, "error", t("Could not delete the model: ", "Không xóa được mô hình: ") + error.message);
  back(orgId, "ok", t("Back to the built-in model.", "Đã quay lại mô hình mặc định."));
}
