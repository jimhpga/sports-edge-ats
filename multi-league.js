(() => {
  // League detection: URL path (/nfl, /nba, /ufc) or injected window.__LEAGUE
  const path = location.pathname.toLowerCase();
  let league = (window.__LEAGUE || (path.startsWith('/nba') ? 'NBA' : path.startsWith('/ufc') ? 'UFC' : 'NFL'));
  window.LEAGUE = league;

  // Data roots per league
  const DATA_ROOT = { NFL:'/data/nfl', NBA:'/data/nba', UFC:'/data/ufc' };
  window.getWeekUrl = (w) => {
    const ww = (''+w).padStart(2,'0');
    return ${DATA_ROOT[league]}/week-.json;
  };

  // Navbar (idempotent)
  function ensureNav() {
    if (document.getElementById('se-topnav')) return;
    const nav = document.createElement('div');
    nav.id = 'se-topnav';
    nav.style.cssText = "position:sticky;top:0;z-index:9998;background:#0b0b0e;border-bottom:1px solid #222;display:flex;gap:10px;align-items:center;padding:10px 12px";
    nav.innerHTML = \
      <a class="tab" href="/nfl" style="padding:6px 10px;border-radius:8px;border:1px solid #2a2f39;color:#e5e7eb;text-decoration:none">NFL</a>
      <a class="tab" href="/nba" style="padding:6px 10px;border-radius:8px;border:1px solid #2a2f39;color:#e5e7eb;text-decoration:none">NBA</a>
      <a class="tab" href="/ufc" style="padding:6px 10px;border-radius:8px;border:1px solid #2a2f39;color:#e5e7eb;text-decoration:none">UFC</a>
      <a class="tab" href="/reports" style="padding:6px 10px;border-radius:8px;border:1px solid #2a2f39;color:#e5e7eb;text-decoration:none;margin-left:auto">Reports</a>
      <button id="se-cmd" style="margin-left:6px;padding:6px 10px;border-radius:8px;border:1px solid #2a2f39;background:#1f2937;color:#e5e7eb;cursor:pointer">Search (/)</button>
    \;
    document.body.prepend(nav);
    // highlight active
    [...nav.querySelectorAll('.tab')].forEach(a=>{
      if (location.pathname.startsWith(a.getAttribute('href'))) {
        a.style.background = '#3b82f6'; a.style.borderColor = '#2563eb';
      }
    });
  }

  // Command palette (/) – quick jump to week/team (simple client-side)
  function ensurePalette(){
    if (document.getElementById('se-pal')) return;
    const pal = document.createElement('div');
    pal.id = 'se-pal';
    pal.style.cssText = "position:fixed;inset:0;display:none;align-items:flex-start;justify-content:center;background:rgba(0,0,0,.4)";
    pal.innerHTML = \
      <div style="margin-top:10vh;background:#0f1115;border:1px solid #1f2430;border-radius:12px;width:min(720px,92%);padding:12px">
        <input id="se-q" placeholder="Search team / week (e.g., W8, Chiefs, Over, ML)" style="width:100%;padding:10px;border-radius:10px;border:1px solid #2a2f39;background:#0b0b0e;color:#e5e7eb">
        <div id="se-results" style="max-height:50vh;overflow:auto;margin-top:8px"></div>
      </div>\;
    document.body.appendChild(pal);
    const show = (v)=> pal.style.display=v?'flex':'none';
    const q = pal.querySelector('#se-q');
    document.addEventListener('keydown', (e)=>{ if (e.key==='/'){ e.preventDefault(); show(true); q.focus(); q.select(); }});
    document.getElementById('se-cmd')?.addEventListener('click', ()=>{ show(true); q.focus(); q.select(); });
    pal.addEventListener('click', (e)=>{ if(e.target===pal) show(false); });
    q.addEventListener('keydown', (e)=>{ if(e.key==='Escape') show(false); });
    q.addEventListener('input', async ()=>{
      const val = q.value.trim().toLowerCase();
      const box = pal.querySelector('#se-results');
      if (!val) { box.innerHTML=''; return; }
      // very light client suggestions: weeks and simple team matches if current state has rows
      let suggestions=[];
      for(let w=1; w<=18; w++){ const tag = 'w'+w; if(tag.startsWith(val)) suggestions.push({label:Week 18 — , href:(league==='NFL'?'/nfl':'/'+league.toLowerCase())+?week=18}); }
      if (window.state?.homeRows?.length){
        suggestions = suggestions.concat(window.state.homeRows
          .map(r=>[r.away||'', r.home||''])
          .flat()
          .filter(Boolean)
          .filter(t=>t.toLowerCase().includes(val))
          .slice(0,10)
          .map(t=>({label:${t} — , href: location.pathname + ?q=})));
      }
      box.innerHTML = suggestions.map(s=>\<div><a href="\" style="display:block;padding:8px;border-radius:8px;border:1px solid #2a2f39;color:#e5e7eb;text-decoration:none;margin:6px 0">\</a></div>\).join('') || '<div style="color:#9aa7bd;padding:8px">No matches.</div>';
    });
  }

  function boot() {
    ensureNav();
    ensurePalette();
    // tell app which league to load (if it supports a hook)
    if (window.setLeague) { try { window.setLeague(league); } catch(e){} }
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
