const crypto = require("crypto");

const SECRET = process.env.AUTH_SECRET || "";

function verify(token) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [b64, sig] = parts;
  const h = crypto.createHmac("sha256", SECRET).update(b64).digest("base64");
  if (h !== sig) return false;
  try {
    const json = Buffer.from(b64, "base64").toString("utf8");
    const payload = JSON.parse(json);
    return !!payload && !!payload.sub;
  } catch (e) {
    return false;
  }
}

module.exports = async (req, res) => {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  const token = match ? match[1] : null;

  if (!SECRET) {
    res.status(500).json({ error: "Auth not configured" });
    return;
  }
  if (verify(token)) {
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
};