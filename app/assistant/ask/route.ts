import { loadContext, DEMO_ORG } from "@/lib/context";
import { buildFacts, askAI, ruleAnswer, unverifiedNumbers, SYSTEM_PROMPT } from "@/lib/assistant";
import { baseConfig, model, DEFAULT_PRESET, type Params } from "@/lib/data";
import { publicFacts, publicRuleAnswer } from "@/lib/assistant";
import { scoreOrder, withPreset } from "@/lib/rvs";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n";
import { LANDING_EXAMPLE } from "@/lib/example";

/** POST /assistant/ask  { question, history, org, preset, method } -> { answer, source }. Visitors who are not logged in get general answers only. */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const question = String(body?.question ?? "").trim().slice(0, 500);
  if (!question) return Response.json({ error: "Type a question first." }, { status: 400 });

  const history = Array.isArray(body.history) ? body.history.filter((m: any) => typeof m?.text === "string") : [];

  // Visitor on the landing page: no data access, general answers only
  const { data: { user: visitor } } = await (await createClient()).auth.getUser();
  if (!visitor) {
    const { t } = await getT();
    const cfg = withPreset(baseConfig, DEFAULT_PRESET);
    const drop = scoreOrder(cfg, model, LANDING_EXAMPLE, "dropoff");
    const courier = scoreOrder(cfg, model, LANDING_EXAMPLE, "courier_pickup");
    const facts = publicFacts(cfg, { drop, courier, predReturn: drop.predReturnProb });
    const ai = await askAI(question, facts, history);
    if (ai && unverifiedNumbers(ai, facts, SYSTEM_PROMPT, question).length === 0) return Response.json({ answer: ai, source: "ai" });
    return Response.json({ answer: publicRuleAnswer(t, question), source: ai ? "checked" : "rules" });
  }

  const sp: Params = { org: body.org, preset: body.preset, method: body.method };
  const { user, scored, rows, cfg, method, modelLabel, orgId, t, f } = await loadContext(sp);
  if (!user) return Response.json({ error: t("Please log in again.", "Vui lòng đăng nhập lại.") }, { status: 401 });

  // Never send the data-set name to the AI: personal data sets are named after the user's email.
  const orgName = orgId === DEMO_ORG ? "demo data (simulated)" : "the company's own uploaded data";
  const facts = buildFacts(question, scored, rows, cfg, method, modelLabel, orgName);
  const ai = await askAI(question, facts.text, history);
  if (ai) {
    // If the AI wrote numbers ReLoop never gave it, do not show them: use the template answer instead.
    const bad = unverifiedNumbers(ai, facts.text, SYSTEM_PROMPT, question); // the prompt already contains KNOWLEDGE and the rules
    if (bad.length === 0) return Response.json({ answer: ai, source: "ai" });
    console.warn("Assistant answer had unverified numbers:", bad.join(", "));
    return Response.json({ answer: ruleAnswer(question, scored, facts.order, t, f), source: "checked" });
  }
  return Response.json({ answer: ruleAnswer(question, scored, facts.order, t, f), source: "rules" });
}
