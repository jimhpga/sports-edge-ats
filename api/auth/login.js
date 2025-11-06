const crypto = require("crypto");

const SECRET = process.env.AUTH_SECRET || "";

function sign(payload) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64");
  const h = crypto.createHmac("sha256", SECRET).update(b64).digest("base64");
  return `${b64}.${h}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = await new Promise((r) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => r(s ? JSON.parse(s) : {}));
  });
  const { password } = body || {};
  const expected = process.env.SITE_PASSWORD || "";

  if (!SECRET || !expected) {
    res.status(500).json({ error: "Auth not configured" });
    return;
  }

  if (password !== expected) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const payload = { sub: "site-user", iat: Date.now() };
  const token = sign(payload);

  // NOTE: For local http testing, remove "Secure" below, then restore for production.
  const cookie = `auth=${token}; HttpOnly; Path=/; Max-Age=86400; Secure; SameSite=Lax`;

  res.setHeader("Set-Cookie", cookie);
  res.status(200).json({ ok: true });
};