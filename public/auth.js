window.EdgeAuth = (()=>{
  const EXPECTED = "4a469cc125debf487924f34d597b3dbd4b044defbcf2e74fb4a6cb76c3b1456a";
  const COOKIE   = "edge_auth";

  function setCookie(v){
    document.cookie = COOKIE + "=" + v + "; Path=/; Max-Age=2592000; SameSite=Lax; Secure";
  }
  function getCookie(){
    const m = document.cookie.split("; ").find(x => x.startsWith(COOKIE + "="));
    return m ? m.split("=")[1] : null;
  }
  async function sha256Hex(text){
    const buf = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  async function login(pw){
    const h = await sha256Hex(pw || "");
    if(h === EXPECTED){ setCookie(h); return true; }
    return false;
  }
  function isAuthed(){ return getCookie() === EXPECTED; }
  function logout(){ document.cookie = COOKIE + "=; Path=/; Max-Age=0; SameSite=Lax; Secure"; }
  return { login, isAuthed, logout, EXPECTED };
})();