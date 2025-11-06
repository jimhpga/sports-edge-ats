module.exports = (req, res) => {
  // NOTE: remove "Secure" for local http testing, restore before production.
  const cookie = `auth=deleted; HttpOnly; Path=/; Max-Age=0; Secure; SameSite=Lax`;
  res.setHeader("Set-Cookie", cookie);
  res.status(200).json({ ok: true });
};