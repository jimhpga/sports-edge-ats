(function(){
  function injectBanner(){
    const bar = document.createElement('div');
    bar.id = "edge-disclaimer";
    bar.style.cssText = "position:sticky;top:0;z-index:9999;background:#0b1220;border-bottom:1px solid #25324a;color:#cde2ff;padding:10px 14px;font:500 13px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;gap:12px;align-items:center";
    bar.innerHTML = "<strong>Information Only</strong> — Educational/entertainment. Not financial or betting advice. Do not use to place wagers. Past performance ≠ future results.<span style='margin-left:auto'></span>";
    const right = document.createElement('a');
    right.textContent = "Logout";
    right.href = "/logout.html";
    right.style.cssText="color:#9fd5ff;text-decoration:underline;font-weight:600";
    bar.lastElementChild.replaceWith(right);
    document.body.prepend(bar);
  }

  async function ensure(){
    if(!window.EdgeAuth){
      await new Promise(r=>{
        const s=document.createElement('script');
        s.src="/auth.js"; s.onload=r; document.head.appendChild(s);
      });
    }
    if(!window.EdgeAuth.isAuthed()){
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = "/login.html?next=" + next;
      return;
    }
    injectBanner();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ensure);
  else ensure();
})();