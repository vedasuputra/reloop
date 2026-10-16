import { loadContext } from "@/lib/context";
import { buildFacts, askGemini, ruleAnswer } from "@/lib/assistant";
import type { Params } from "@/lib/data";

/** POST /assistant/ask  { question, history, org, preset, method } -> { answer, source } (login required). */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const question = String(body?.question ?? "").trim().slice(0, 500);
  if (!question) return Response.json({ error: "Type a question first." }, { status: 400 });

  const sp: Params = { org: body.org, preset: body.preset, method: body.method };
  const { user, scored, rows, cfg, method, modelLabel, orgs, orgId } = await loadContext(sp);
  if (!user) return Response.json({ error: "Please log in again." }, { status: 401 });

  const orgName = orgs.find((o) => o.id === orgId)?.name ?? "data";
  const facts = buildFacts(question, scored, rows, cfg, method, modelLabel, orgName);
  const history = Array.isArray(body.history) ? body.history.filter((m: any) => typeof m?.text === "string") : [];
  const ai = await askGemini(question, facts.text, history);
  if (ai) return Response.json({ answer: ai, source: "ai" });
  return Response.json({ answer: ruleAnswer(question, scored, facts.order), source: "rules" });
}
