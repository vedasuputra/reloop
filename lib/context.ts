import { createClient } from "@/lib/supabase/server";
import { fetchOrders, readSettings, scoreAll, model as baseModel, type Params, type CostSettings } from "@/lib/data";
import type { TrainedModel } from "@/lib/train";
import type { Model } from "@/lib/rvs";

export const DEMO_ORG = "00000000-0000-0000-0000-000000000001";

export interface OrgInfo { id: string; name: string; role: string }

/** Organisations the logged-in user belongs to (demo + their own). */
export async function getOrgs(): Promise<OrgInfo[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("members").select("org_id, role, organizations(name)");
  return (data ?? []).map((m: any) => ({
    id: m.org_id, role: m.role, name: m.organizations?.name ?? "Organisasi",
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
  const modelLabel = orgModel
    ? `model khusus data ini (dilatih ${orgModel.trained_at.slice(0, 10)}, AUC ${orgModel.metrics.auc_model})`
    : "model bawaan (dilatih di data simulasi)";
  const rows = await fetchOrders(orgId);
  const scored = scoreAll(rows, cfg, method, model);
  const qs = `?method=${method}&preset=${presetKey}&org=${orgId}`;
  return { user, method, presetKey, cfg, orgs, orgId, rows, scored, qs, hasCustom: custom !== null, model, orgModel, modelLabel };
}
