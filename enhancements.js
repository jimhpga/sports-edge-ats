(() => {
  // --- helpers ---
  const $  = (s, r=document) => r.querySelector(s);
  const enhancements.js = (s, r=document) => Array.from(r.querySelectorAll(s));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // Exposed by app (best effort)
  const api = {
    get weeks() { return (window.state && window.state.weeksAvailable) || []; },
    get week()  { return (window.state && window.state.week) || null; },
    set week(w) { if (window.loadWeek) return window.loadWeek(Number(w)); },
    render()    { if (window.renderHome) window.renderHome(); },
    hasEdge()   { return typeof window.edgeMode !== "undefined"; },
    setEdge(v)  { try { window.edgeMode = !!v; this.render(); } catch(e){}; },
  };

  // --- UI container ---
  function ensureToolbar() {
    let bar = #se-toolbar;
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "se-toolbar";
    bar.style.cssText = "position:sticky;top:0;z-index:9999;background:#0b0b0e;color:#fff;padding:8px 10px;border-bottom:1px solid #1e1e22;display:flex;gap:8px;flex-wrap:wrap;align-items:center;font:14px/1.2 system-ui,Segoe UI,Roboto";
    bar.innerHTML = 
      <button id="se-current" style="padding:6px 10px;border-radius:8px;border:none;cursor:pointer">Jump to Current</button>
      <div id="se-wgrid" style="display:flex;gap:6px;flex-wrap:wrap"></div>
      <button id="se-green" style="padding:6px 10px;border-radius:8px;border:none;cursor:pointer">Green Pack</button>
      <label style="display:flex;align-items:center;gap:6px">
        <span>Min EV</span>
        <input id="se-ev" type="range" min="-10" max="20" step="0.5" value="0">
        <span id="se-evlbl">0%</span>
      </label>
      <span id="se-printHdr" style="margin-left:auto;opacity:.8"></span>
    ;
    document.body.prepend(bar);
    return bar;
  }

  function buildWeekGrid() {
    const cont = #se-wgrid;
    if (!cont) return;
    const weeks = api.weeks.length ? api.weeks : Array.from({length:18},(_,i)=>i+1);
    cont.innerHTML = weeks.map(w => {
      const act = (api.week === w) ? "background:#3a82f6;color:#fff;" : "background:#1a1a1f;color:#ddd;";
      return <button class="se-chip" data-w="" style="padding:6px 8px;border-radius:10px;border:none;cursor:pointer;">W</button>;
    }).join("");
    enhancements.js(".se-chip", cont).forEach(btn => on(btn, "click", () => {
      const w = Number(btn.dataset.w);
      localStorage.setItem("seLastWeek", String(w));
      api.week = w;
      // update highlight
      buildWeekGrid();
    }));
  }

  function guessCurrentWeek() {
    // If app knows weeks, pick max; else fallback to 1..18 heuristic (Sun-based)
    if (api.weeks.length) return Math.max(...api.weeks);
    const today = new Date();
    const start = new Date(today.getFullYear(), 8, 1); // Sept 1 baseline
    const w = Math.min(18, Math.max(1, Math.ceil((today - start) / (7*24*3600*1000))));
    return w;
  }

  // --- Filter memory (works with common filter IDs/classes if present) ---
  const FILTER_KEY = "seFiltersV1";
  function saveFilters() {
    const payload = {
      q: #search?.value ?? #fSearch?.value ?? "",
      day: #fDay?.value ?? "",
      wx: #fWeather?.value ?? "",
      colors: enhancements.js(".f-color").map(x=>[x.value, x.checked]),
      types:  enhancements.js(".f-type").map(x=>[x.value, x.checked]),
      minEV: #se-ev?.value ?? "0"
    };
    localStorage.setItem(FILTER_KEY, JSON.stringify(payload));
  }
  function loadFilters() {
    try {
      const p = JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
      if (p.q)       { const el=#search||#fSearch; if(el) el.value=p.q; }
      if (p.day && #fDay)      #fDay.value = p.day;
      if (p.wx && #fWeather)   #fWeather.value = p.wx;
      if (p.colors) p.colors.forEach(([v,c])=>{ const el=enhancements.js(".f-color").find(x=>x.value===v); if(el) el.checked=c; });
      if (p.types)  p.types.forEach(([v,c])=>{ const el=enhancements.js(".f-type").find(x=>x.value===v); if(el) el.checked=c; });
      if (p.minEV && #se-ev)   #se-ev.value = p.minEV;
      if (#se-evlbl) #se-evlbl.textContent = ${#se-ev.value}%;
    } catch(e){}
  }
  function wireFilterMemory() {
    const watch = [
      #search, #fSearch, #fDay, #fWeather,
      ...enhancements.js(".f-color"), ...enhancements.js(".f-type"), #se-ev
    ].filter(Boolean);
    watch.forEach(el => on(el, "input", ()=>{ saveFilters(); api.render(); updatePrintHeader(); }));
  }

  // --- EV filter (expects row.ev or row.edgeProb + row.decOdds; integrates via window.computeEV hook if present) ---
  function installEVHook() {
    // If app exposes computeEV, we won't override; else create a soft hook that list renderer can read.
    if (!window.computeEV) {
      window.computeEV = function(row) {
        if (typeof row?.ev === "number") return row.ev;
        if (row?.edgeProb && row?.decOdds) {
          const p=row.edgeProb, o=row.decOdds, stake=100;
          const win=(o-1)*stake*p, lose=(1-p)*stake;
          return ((win-lose)/stake)*100;
        }
        return null;
      };
    }
    // Add global minEV getter used by table render (if you adopt it)
    window.getMinEV = () => Number(#se-ev?.value || 0);
  }

  // --- Green Pack ---
  function greenPack() {
    if (api.hasEdge()) api.setEdge(true);
    // If color checkboxes exist, narrow to green
    enhancements.js(".f-color").forEach(x => x.checked = (x.value === "green"));
    saveFilters(); api.render(); updatePrintHeader();
  }

  // --- Current/Last week boot + deeplinks ---
  function applyDeeplink() {
    const q = new URLSearchParams(location.search);
    const w = Number(q.get("week")||"0");
    if (w) { localStorage.setItem("seLastWeek", String(w)); api.week = w; }
    const ev = q.get("minEV"); if (ev && #se-ev) { #se-ev.value = ev; }
  }
  function updateURL() {
    const w = api.week || localStorage.getItem("seLastWeek") || "";
    const ev = #se-ev?.value || "0";
    const u = new URL(location.href);
    u.searchParams.set("week", String(w));
    u.searchParams.set("minEV", String(ev));
    history.replaceState({}, "", u.toString());
  }

  // --- Print header (for PDF exports) ---
  function updatePrintHeader() {
    const w = api.week || localStorage.getItem("seLastWeek") || "?";
    const ev = #se-ev?.value || "0";
    const hdr = #se-printHdr;
    if (!hdr) return;
    const d = new Date();
    hdr.textContent = Week  • Min EV % • ;
  }
  function installPrintStyles() {
    const style = document.createElement("style");
    style.textContent = 
      @media print {
        #se-toolbar { position:static; color:#000; background:#fff; border:none; }
        #se-printHdr { font-weight:600; color:#000; }
      }
    ;
    document.head.appendChild(style);
  }

  // --- Wire up UI ---
  function bootUI() {
    ensureToolbar();
    installPrintStyles();
    installEVHook();
    loadFilters();
    buildWeekGrid();
    updatePrintHeader();

    on(#se-green, "click", greenPack);
    on(#se-current, "click", () => {
      const last = Number(localStorage.getItem("seLastWeek")||0);
      const guess = guessCurrentWeek();
      const target = last || guess;
      if (target) { api.week = target; localStorage.setItem("seLastWeek", String(target)); buildWeekGrid(); updatePrintHeader(); }
    });
    on(#se-ev, "input", (e)=>{ #se-evlbl.textContent = ${e.target.value}%; saveFilters(); api.render(); updateURL(); updatePrintHeader(); });

    // Persist filters while user tweaks
    wireFilterMemory();

    // Set week on first boot from deeplink or last saved
    applyDeeplink();
    if (!api.week && window.loadWeek) {
      const last = Number(localStorage.getItem("seLastWeek")||0) || guessCurrentWeek();
      window.loadWeek(last).finally(()=>{ buildWeekGrid(); updateURL(); updatePrintHeader(); });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootUI);
  } else {
    bootUI();
  }
})();
