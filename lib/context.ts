import { createClient } from "@/lib/supabase/server";
import { fetchOrders, readSettings, scoreAll, model as baseModel, type Params, type CostSettings } from "@/lib/data";
import type { TrainedModel } from "@/lib/train";
import type { Model } from "@/lib/rvs";
import { getT, orgLabel } from "@/lib/i18n";

export const DEMO_ORG = "00000000-0000-0000-0000-000000000001";

export interface OrgInfo { id: string; name: string; role: string; orders: number }

/** Organisations the logged-in user belongs to (demo + their own). */
export async function getOrgs(): Promise<OrgInfo[]> {
  const supabase = await createClient();
  const { t } = await getT();
  const { data } = await supabase.from("members").select("org_id, role, organizations(name)");
  type Member = { org_id: string; role: string; organizations: { name?: string } | null };
  const members = (data ?? []) as unknown as Member[];
  // How many orders each data set holds, so an empty one (a new account that has not uploaded anything) can be greyed out in the pickers
  const counts = await Promise.all(members.map(async (m) => {
    const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("org_id", m.org_id);
    return count ?? 0;
  }));
  return members.map((m, i) => ({
    id: m.org_id, role: m.role, name: orgLabel(t, m.organizations?.name ?? t("Organisation", "Tổ chức")), orders: counts[i],
  })).sort((a, b) => (a.id === DEMO_ORG ? -1 : b.id === DEMO_ORG ? 1 : 0));
}

/** A company's own cost numbers, or null if it has not saved any. */
export async function getCostSettings(orgId: string): Promise<CostSettings | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("org_settings").select("settings").eq("org_id", orgId).maybeSingle();
  return (data?.settings as CostSettings) ?? null;
}

/** A model retrained on this organisation's own orders, or null. */
export async function getOrgModel(orgId: string): Promise<TrainedModel | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("org_models").select("model").eq("org_id", orgId).maybeSingle();
  return (data?.model as TrainedModel) ?? null;
}

/** Everything a screen needs: user, settings, chosen organisation, scored orders. */
export async function loadContext(sp: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgs = await getOrgs();
  const orgId = orgs.some((o) => o.id === sp.org) ? sp.org! : (orgs[0]?.id ?? DEMO_ORG);
  const custom = await getCostSettings(orgId);
  const { method, presetKey, cfg } = readSettings(sp, custom);
  const orgModel = await getOrgModel(orgId);
  const model: Model = orgModel ?? baseModel;
  const { lang, t, f } = await getT();
  const modelLabel = orgModel
    ? t(`this data set's own model (trained ${orgModel.trained_at.slice(0, 10)}, AUC ${orgModel.metrics.auc_model})`,
        `mô hình riêng của bộ dữ liệu này (huấn luyện ${orgModel.trained_at.slice(0, 10)}, AUC ${orgModel.metrics.auc_model})`)
    : t("built-in model (trained on simulated data)", "mô hình mặc định (huấn luyện trên dữ liệu mô phỏng)");
  const rows = await fetchOrders(orgId);
  const scored = scoreAll(rows, cfg, method, model);
  const qs = `?method=${method}&preset=${presetKey}&org=${orgId}`;
  return { user, method, presetKey, cfg, orgs, orgId, rows, scored, qs, hasCustom: custom !== null, model, orgModel, modelLabel, lang, t, f };
}
