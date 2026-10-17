"use server";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { DEMO_ORG, getOrgs } from "@/lib/context";
import { getT } from "@/lib/i18n";

function back(msg: string): never {
  redirect(`/privacy?error=${encodeURIComponent(msg)}`);
}

/**
 * Delete the signed-in person's account: their login and their own data set (orders, cost settings, saved model). What belongs to
 * the organisation and the shared sample data is never touched. Removing a login needs the server-only SUPABASE_SERVICE_ROLE_KEY;
 * without it nothing is deleted and the person is told so.
 */
export async function deleteAccount() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?login=1");

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) back(t("Deleting accounts is not set up on this server yet, so nothing was deleted.", "Máy chủ này chưa được thiết lập để xóa tài khoản nên chưa có gì bị xóa."));

  // 1. their own data set(s): the ones they own (never the sample, never the organisation's)
  const own = (await getOrgs()).filter((o) => o.role === "owner" && o.id !== DEMO_ORG);
  for (const o of own) {
    for (const table of ["orders", "org_settings", "org_models"]) {
      const { error } = await supabase.from(table).delete().eq("org_id", o.id);
      if (error) back(t(`Could not delete the data in ${o.name}: `, `Không xóa được dữ liệu trong ${o.name}: `) + error.message);
    }
  }

  // 2. the data set rows and the login itself, with the admin key
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const o of own) {
    await admin.from("members").delete().eq("org_id", o.id);
    await admin.from("organizations").delete().eq("id", o.id);
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) back(t("Could not delete the account: ", "Không xóa được tài khoản: ") + error.message);

  try { await supabase.auth.signOut(); } catch { /* the login is gone already; the cookie is dropped anyway */ }
  redirect("/?deleted=1"); // the landing page then says so (AccountDeletedToast)
}
