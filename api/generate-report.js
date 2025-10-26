// api/generate-report.js
//
// FINAL VERSION
// - Minimal Vercel-compatible serverless function
// - Pure CommonJS
// - No custom runtime export (Vercel will treat this as Node by default since it's using module.exports)
// - Always returns 200 with actionable coaching
// - Uses OpenAI if OPENAI_API_KEY is set; otherwise uses fallback
//
// Test from PowerShell:
// curl -Method POST `
//   -Uri https://virtualcoachai.net/api/generate-report `
//   -Headers @{ "Content-Type" = "application/json" } `
//   -Body '{ "level": "intermediate", "miss": "pull-hook", "goal": "stop bowling it left under pressure" }'


// ---------- helper: build AI prompt ----------
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
   Each should include: what to feel, and WHY it matters for ball flight.
2. Give ONE Power Note. Only talk about speed if control is stable. Be honest.
3. Give ONE Day-One Drill. Simple, specific, can do today.

Rules:
- Talk directly to the player.
- No shame. No "keep your head down" nonsense.
- Use lesson-tee language: P6, face control, start line, rotate not flip.
- Be punchy. No fluff.
- Output plain text, no markdown.
`;
}

// ---------- helper: offline fallback card ----------
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
Rotation squares the face repeatably. Flip is timing-based, and it breaks under pressure.`,

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

// ---------- helper: parse request body safely ----------
async function readJsonBody(req) {
  // sometimes Vercel gives parsed object
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  // sometimes it's a string
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  // fallback: read stream
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ---------- helper: send JSON response with CORS ----------
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(data));
}

// ---------- lazy load OpenAI client so require() doesn't kill cold start ----------
function getOpenAIClient() {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.warn("No OPENAI_API_KEY in env; fallback mode.");
      return null;
    }
    const OpenAI = require("openai"); // CommonJS require
    return new OpenAI({ apiKey: key });
  } catch (err) {
    console.error("OpenAI init failed:", err);
    return null;
  }
}

// ---------- the actual handler ----------
async function handler(req, res) {
  // Handle browser preflight from fetch()
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true, preflight: true });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const { level, miss, goal } = body || {};

    const client = getOpenAIClient();
    let summaryText;
    let flavor;

    if (client) {
      try {
        const completion = await client.responses.create({
          model: "gpt-4o-mini",
          input: buildPrompt({ level, miss, goal }),
        });

        const aiText = (completion && completion.output_text || "").trim();

        if (aiText) {
          summaryText = aiText;
          flavor = "openai:gpt-4o-mini";
        } else {
          summaryText = fallbackCard({ level, miss, goal });
          flavor = "fallback:empty-ai-output";
        }
      } catch (err) {
        console.error("OpenAI call failed:", err);
        summaryText = fallbackCard({ level, miss, goal });
        flavor = "fallback:openai-error";
      }
    } else {
      // no API key or init failed
      summaryText = fallbackCard({ level, miss, goal });
      flavor = "fallback:no-openai";
    }

    const payload = {
      ok: true,
      summary: summaryText,
      meta: {
        level: level || null,
        miss: miss || null,
        goal: goal || null,
        generated_at: new Date().toISOString(),
        model_used: flavor,
      },
    };

    sendJson(res, 200, payload);
  } catch (err) {
    console.error("FATAL handler error:", err);

    // absolute worst case: still give them a usable coaching card
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
      warning: "AI call failed at runtime; fallback used.",
    });
  }
}

// Vercel Node serverless expects module.exports = (req,res)=>{...}
module.exports = handler;
