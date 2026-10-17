"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEMO_ORG, getOrgs } from "@/lib/context";

/** What is remembered about a person's onboarding. It lives in their account (the user's metadata in Supabase), so it follows them across devices. */
export type Onboarding = { welcomed?: boolean; data?: "sample" | "own" };

async function remember(patch: Onboarding) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/?login=1");
  const before = (user.user_metadata?.onboarding ?? {}) as Onboarding;
  await supabase.auth.updateUser({ data: { onboarding: { ...before, ...patch } } });
  revalidatePath("/", "layout");
}

/** The welcome popup was closed: it is not shown again (the rocket icon in the sidebar stays). */
export async function closeWelcome() {
  await remember({ welcomed: true });
}

/** "Explore ready-made data": the organisation's own data set when it has one (the person may read it), otherwise the shared sample. */
export async function startWithSample() {
  await remember({ welcomed: true, data: "sample" });
  const company = (await getOrgs()).find((o) => o.id !== DEMO_ORG && o.role !== "owner" && o.orders > 0);
  redirect(`/dashboard?org=${company?.id ?? DEMO_ORG}`);
}

/** "Upload your own data". */
export async function startWithUpload() {
  await remember({ welcomed: true, data: "own" });
  redirect("/upload");
}
