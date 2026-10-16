import { createClient } from "@/lib/supabase/server";
import { fetchOrders, readSettings, scoreAll, type Params } from "@/lib/data";

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

/** Everything a screen needs: user, settings, chosen organisation, scored orders. */
export async function loadContext(sp: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { method, presetKey, cfg } = readSettings(sp);
  const orgs = await getOrgs();
  const orgId = orgs.some((o) => o.id === sp.org) ? sp.org! : (orgs[0]?.id ?? DEMO_ORG);
  const rows = await fetchOrders(orgId);
  const scored = scoreAll(rows, cfg, method);
  const qs = `?method=${method}&preset=${presetKey}&org=${orgId}`;
  return { user, method, presetKey, cfg, orgs, orgId, rows, scored, qs };
}
