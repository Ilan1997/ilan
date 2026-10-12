// Supabase Edge Function "maya-ai" — a tiny, authenticated proxy to Gemini (free tier).
// The Gemini key lives ONLY here (secret GEMINI_API_KEY), never in the page or the repo.
// Every call needs a signed-in user (JWT checked below) and is counted per user per day.
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
// If the main model is rejected (renamed/retired/unavailable), try these in order. Override with GEMINI_FALLBACK_MODELS (comma separated).
const FALLBACKS = (Deno.env.get("GEMINI_FALLBACK_MODELS") ?? "gemini-flash-latest").split(",").map((x) => x.trim()).filter(Boolean);
const DAILY_LIMIT = Number(Deno.env.get("DAILY_LIMIT") ?? "40");
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://ilan1997.github.io").split(",").map((s) => s.trim());
const MAX_SYSTEM = 30000, MAX_TOTAL = 90000, MAX_MESSAGES = 40;

function cors(origin: string | null) {
  const o = origin && ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, 405, origin);

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return json({ error: "not_configured", message: "שירות ה-AI עוד לא הוגדר." }, 503, origin);

  // 1. who is calling? (own check — works with the new Supabase key types too)
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: u, error: uerr } = jwt ? await admin.auth.getUser(jwt) : { data: null, error: new Error("no jwt") };
  if (uerr || !u?.user) return json({ error: "login", message: "צריך להתחבר לחשבון כדי לדבר עם מאיה." }, 401, origin);

  // 2. validate input
  let body: { system?: unknown; messages?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400, origin); }
  const system = typeof body.system === "string" ? body.system : "";
  const msgs = Array.isArray(body.messages) ? body.messages : [];
  if (system.length > MAX_SYSTEM || msgs.length < 1 || msgs.length > MAX_MESSAGES) return json({ error: "bad_request" }, 400, origin);
  let total = system.length;
  for (const m of msgs) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return json({ error: "bad_request" }, 400, origin);
    total += m.content.length;
  }
  if (total > MAX_TOTAL) return json({ error: "too_long", message: "השיחה ארוכה מדי — התחל שיחה חדשה." }, 413, origin);

  // 3. per-user daily cap (shared free quota must not be drained by one account)
  const { data: n, error: rerr } = await admin.rpc("bump_ai_usage", { p_user: u.user.id });
  if (rerr) return json({ error: "server" }, 500, origin);
  if (Number(n) > DAILY_LIMIT) return json({ error: "limit", message: `הגעת למכסה היומית (${DAILY_LIMIT} הודעות). אפשר להמשיך מחר, או להגדיר מפתח Gemini אישי.` }, 429, origin);

  // 4. call Gemini
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: msgs.map((m: { role: string; content: string }) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
  });
  let r: Response | null = null, data: any = {}, lastDetail = "";
  for (const model of [MODEL, ...FALLBACKS.filter((x) => x !== MODEL)]) {
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey }, body: payload,
      });
      data = await r.json().catch(() => ({}));
    } catch (e) { lastDetail = `${model}: network ${String(e).slice(0, 120)}`; console.error("gemini fetch failed", lastDetail); r = null; continue; }
    if (r.ok && !data?.error) break;
    lastDetail = `${model}: ${r.status} ${String(data?.error?.message ?? "").slice(0, 200)}`;
    console.error("gemini error", lastDetail); // visible in Supabase → Edge Functions → Logs
    if (r.status === 401 || r.status === 403 || r.status === 429) break; // key/permission/quota problems: other models (and aliases like -latest) share the same free-tier quota, so extra attempts only burn requests per minute. Fall through to the next model only for 404/400 (model retired).
  }
  if (!r || !r.ok || data?.error) {
    const busy = r?.status === 429;
    return json({ error: busy ? "busy" : "upstream", detail: lastDetail, message: busy ? "השירות עמוס כרגע — נסה שוב בעוד דקה." : "שגיאה מול ה-AI." }, busy ? 503 : 502, origin);
  }
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { thought?: boolean; text?: unknown }) => !p.thought && typeof p.text === "string")
    .map((p: { text: string }) => p.text).join("");
  return json({ text }, 200, origin);
});
