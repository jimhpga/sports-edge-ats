// api/edge-data.js  (CommonJS)
const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  try {
    const p = path.join(process.cwd(), "public", "edge-data.json");
    let json = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "{}";
    json = json.replace(/^\uFEFF/, ""); // strip BOM
    // clean any stray CP1252 artifacts like "Â·"
    json = json.replace(/Â·/g, "·");

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 200;
    res.end(json);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "read_failed", detail: String(e) }));
  }
};
