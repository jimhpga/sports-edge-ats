// api/generate-report.js
//
// Virtual Coach AI — Coaching Card Generator (safe runtime version)
// - CommonJS module.exports
// - Dynamic import() of openai so Node/ESM mismatch doesn't nuke cold start
// - Always returns 200 with coaching info on POST
// - GET returns a friendly message instead of crashing
//
// Test POST (PowerShell):
// curl -Method POST `
//   -Uri https://virtualcoachai.net/api/generate-report `
//   -Headers @{ "Content-Type" = "application/json" } `
//   -Body '{ "level": "intermediate", "miss": "pull-hook", "goal": "stop bowling it left under pressure" }'

const config = {
  runtime: "nodejs",
};

// ---------- helpers ----------

function buildPrompt({ level, miss, goal }) {
  const lvl = level || "intermediate";
  const missDesc = miss || "pull-hook under pressure";
  const aim = goal || "more control under pressure";

  return `
You are Virtual Coach AI, a veteran PGA-teaching style swing coach.
Your job is to build a focused improvement card for THIS player.

Player level: ${lvl}
Typical miss: ${missDesc}
Main goal: ${aim}

Do the following:
1. Give exactly TWO Priority Fixes. These should tighten control/consistency first.
   Each should include what to feel, and WHY it matters for ball flight.
2. Give ONE Power Note. Only talk about speed if control is stable.
3. Give ONE Day-One Drill. Simple, specific, can do today.

Rules:
- Talk directly to the player.
- No shame, no vague "keep your head down."
- Use lesson tee terms: P6, face control, start line, rotate instead of flip.
- Be punchy. No fluff paragraphs.
- Plain text only.
`;
}

function fallbackCard({ level, miss, goal }) {
  const lvl = level || "intermediate";
  const missDesc = miss || "pull-hook under pressure";
  const aim = goal || "more control under pressure";

  return [
    `PLAYER SNAPSHOT
Level: ${lvl}
Typical miss: ${missDesc}
Main goal: ${aim}`,

    `PRIORITY FIX 1:
Stabilize the clubface through impact instead of "saving it" with the hands.
Right now you're shutting the face late to not miss right, and that turns into the pull-hook.
Quiet the hands at P6 (shaft just before impact) and let your chest rotation square the face.
Rotation squares the face repeatably. Flip is timing-based and breaks under pressure.`,

    `PRIORITY FIX 2:
Get onto your lead side sooner so you don't have to throw the face.
You're hanging back, then slamming the face shut to square it.
Post into the lead leg earlier, chest more over the ball at impact.
When you move left and rotate, you control start line without needing a panic release.`,

    `POWER NOTE:
Do not chase speed yet. Speed on top of chaos just gives you faster chaos.
First we make start line predictable. Then we add ground force and rotation for distance.`,

    `DAY-ONE DRILL:
Make slow-motion swings to P6 and freeze.
Feel: weight already into the lead leg, chest starting to open, hands quiet.
Then turn through without throwing the face.
Do 5 slow reps, then 2 normal-speed swings. That's how you build a motion you can actually trust on the course.`
  ].join("\n\n");
}

// read body safely no matter how Vercel gives it
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function sendJson(res, statusCode, data) {
  res.status(statusCode);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(data));
}

// this replaces getOpenAIClient()
// we try dynamic import('openai') ONLY if we have a key
async function maybeGetOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn("No OPENAI_API_KEY set; will use fallback.");
    return { client: null, modelUsed: "fallback:no-openai" };
  }

  try {
    // dynamic import so CommonJS won't choke
    const mod = await import("openai");
    const OpenAI = mod.default || mod.OpenAI || mod;
    const client = new OpenAI({ apiKey: key });
    return { client, modelUsed: "openai:gpt-4o-mini" };
  } catch (err) {
    console.error("dynamic import('openai') failed:", err);
    return { client: null, modelUsed: "fallback:openai-import-failed" };
  }
}

// ---------- main handler ----------

async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true, preflight: true });
    return;
  }

  // Health / smoke check with GET
  if (req.method === "GET") {
    sendJson(res, 200, {
      ok: false,
      message: "This endpoint expects POST with {level, miss, goal}.",
      hint: "Use POST to get your personalized coaching card.",
    });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const { level, miss, goal } = body || {};

    // Try AI
    const { client, modelUsed } = await maybeGetOpenAI();

    let summaryText = "";
    let finalModelUsed = modelUsed;

    if (client) {
      try {
        const prompt = buildPrompt({ level, miss, goal });
        const completion = await client.responses.create({
          model: "gpt-4o-mini",
          input: prompt,
        });

        summaryText = (completion && completion.output_text || "").trim();
        if (!summaryText) {
          console.warn("AI response empty; using fallback.");
          summaryText = fallbackCard({ level, miss, goal });
          finalModelUsed = "fallback:empty-output";
        }
      } catch (err) {
        console.error("AI call failed at runtime:", err);
        summaryText = fallbackCard({ level, miss, goal });
        finalModelUsed = "fallback:runtime-error";
      }
    } else {
      // no client, so fallback coaching
      summaryText = fallbackCard({ level, miss, goal });
    }

    sendJson(res, 200, {
      ok: true,
      summary: summaryText,
      meta: {
        level: level || null,
        miss: miss || null,
        goal: goal || null,
        generated_at: new Date().toISOString(),
        model_used: finalModelUsed,
      },
    });
  } catch (err) {
    console.error("generate-report FATAL catch:", err);

    sendJson(res, 200, {
      ok: true,
      summary: fallbackCard({}),
      meta: {
        level: null,
        miss: null,
        goal: null,
        generated_at: new Date().toISOString(),
        model_used: "fallback:fatal",
      },
      warning: "AI call failed; fallback used.",
    });
  }
}

module.exports = handler;
module.exports.config = config;
