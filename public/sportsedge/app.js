const qs = (s)=>document.querySelector(s);
const fmt = (n,d=1)=> (n==null||Number.isNaN(+n)) ? "—" : (+n).toFixed(d);
const paths = { meta:"./data/meta.json", current:"./data/nfl/current.json", history:"./data/nfl/history.json" };

const el = {
  meta: qs("#metaMsg"), tbl: qs("#table"), arch: qs("#archive"),
  headline: qs("#headline"), pills: qs("#recordPills"), updated: qs("#updated"),
  selWeek: qs("#selWeek"), selMarket: qs("#selMarket"), selColor: qs("#selColor"),
  txtSearch: qs("#txtSearch"), btnShare: qs("#btnShare"), btnExport: qs("#btnExport"), btnClear: qs("#btnClear")
};

async function getJSON(p, fb){ try{ const r=await fetch(p+"?v="+Date.now(),{cache:"no-store"}); if(!r.ok) throw 0; return await r.json(); }catch{ return fb; } }
const dot=(c)=> c==="green"?'<span class="dot g"></span>':c==="yellow"?'<span class="dot y"></span>':'<span class="dot r"></span>';
const koScore=(s)=>{ if(!s) return 0; const m=/([A-Za-z]{3})\s+(\d{1,2}):(\d{2})/i.exec(s); const order={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7}; return m? (order[m[1]]||0)*10000+(+m[2])*100+(+m[3]) : Date.parse(s)||0; };

function head(){ return `<div class="thead">
  <div>Matchup</div><div class="hideM">Pick</div><div>Edge</div><div class="hideS">Model vs Line</div><div>Kickoff</div>
</div>`; }

function renderRows(list){
  return list.map(g=>{
    const ml=`${g.market||""} ${g.line??""}`.trim();
    const delta=(g.model!=null && g.line!=null)? fmt((+g.model)-(+g.line),1) : "—";
    return `<div class="row">
      <div><div class="pick">${dot(g.color)} ${g.away} @ ${g.home}</div><div class="note hideM">${g.recommendation||""} <span class="k">(${ml})</span></div></div>
      <div class="hideM"><span class="pick">${g.recommendation||""}</span> <span class="k">(${ml})</span></div>
      <div><span class="badge ${g.color||""}">${fmt(g.edge,1)}</span></div>
      <div class="hideS"><span class="k">Model:</span> ${fmt(g.model,1)} · <span class="k">Line:</span> ${fmt(g.line,1)} · <span class="k">Δ:</span> ${delta}</div>
      <div>${g.kickoff||"TBD"}</div>
    </div>`;
  }).join("");
}

function applyFilters(all){
  const m = el.selMarket.value, c = el.selColor.value, q=(el.txtSearch.value||"").toLowerCase();
  let out = all.slice();
  if(m!=="all") out = out.filter(x=>(x.market||"").toLowerCase()===m);
  if(c!=="all") out = out.filter(x=>(x.color||"").toLowerCase()===c);
  if(q) out = out.filter(x=>(x.home||"").toLowerCase().includes(q) || (x.away||"").toLowerCase().includes(q) || (x.recommendation||"").toLowerCase().includes(q));
  out.sort((a,b)=> (+(b.edge||0)) - (+(a.edge||0)) || koScore(a.kickoff)-koScore(b.kickoff));
  return out;
}

function renderWeek(week){
  el.headline.textContent = `Week ${week.week} • ${week.season}`;
  el.updated.textContent  = week.updated ? `Updated ${week.updated}` : "";
  const g = week.games.filter(x=>x.color==='green').length;
  const y = week.games.filter(x=>x.color==='yellow').length;
  const r = week.games.filter(x=>x.color==='red').length;
  el.pills.innerHTML = `<span class="pill g">G ${g}</span><span class="pill y">Y ${y}</span><span class="pill r">R ${r}</span>`;

  const rows = applyFilters(week.games||[]);
  el.tbl.innerHTML = head() + (rows.length ? renderRows(rows) : `<div class="row"><div class="k">No picks in this view.</div></div>`);
}

function renderArchive(history){
  el.arch.innerHTML = (history.weeks||[]).slice().reverse().map(w=>{
    const key=`${w.season}-w${String(w.week).padStart(2,"0")}`;
    return `<div class="weekCard">
      <div class="top"><strong>W${w.week} ${w.season}</strong><span class="k">G ${w.record.green} • Y ${w.record.yellow} • R ${w.record.red}</span></div>
      <div class="k small" style="margin-bottom:8px">Record card</div>
      <div><a class="btn" href="./data/nfl/${key}.json">Open JSON</a>
           <button class="btn ghost" data-load="${key}">Load Week</button></div>
    </div>`;
  }).join("");

  el.arch.addEventListener("click", async e=>{
    const btn=e.target.closest("[data-load]"); if(!btn) return;
    const key=btn.getAttribute("data-load"); const wk=await getJSON(`./data/nfl/${key}.json`,null);
    if(wk){ current = wk; renderWeek(current); el.selWeek.value = key; }
  });
}

function fillWeekDropdown(hist, cur){
  const keys = [...new Set((hist.weeks||[]).map(w=>`${w.season}-w${String(w.week).padStart(2,"0")}`))].sort().reverse();
  el.selWeek.innerHTML = keys.map(k=>{
    const [s,w]=k.split("-w"); const sel=(+s===cur.season && +w===cur.week)?"selected":"";
    return `<option value="${k}" ${sel}>W${+w} ${s}</option>`;
  }).join("");

  el.selWeek.onchange = async ()=>{
    const [season, wk] = el.selWeek.value.split("-w");
    const wkJson = await getJSON(`./data/nfl/${season}-w${wk}.json`, null);
    if(wkJson){ current = wkJson; renderWeek(current); }
  };
}

function bind(){
  [el.selMarket, el.selColor].forEach(x=> x.onchange = ()=> renderWeek(current));
  el.txtSearch.oninput = ()=> renderWeek(current);
  el.btnClear.onclick  = ()=>{ el.selMarket.value="all"; el.selColor.value="all"; el.txtSearch.value=""; renderWeek(current); };
  el.btnShare.onclick  = ()=>{ navigator.clipboard?.writeText(location.href); el.btnShare.textContent="Copied!"; setTimeout(()=>el.btnShare.textContent="Share",900); };
  el.btnExport.onclick = ()=>{
    const rows = applyFilters(current.games||[]);
    const head = ["home","away","market","line","model","edge","color","recommendation","kickoff"];
    const esc  = (v)=>`"${String(v??"").replaceAll('"','""')}"`;
    const csv  = [head.join(","), ...rows.map(r=>head.map(k=>esc(r[k])).join(","))].join("\r\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`SportsEdge-W${current.week}-${current.season}.csv`; a.click();
  };
}

let current = null;
(async function init(){
  const meta = await getJSON(paths.meta, {});
  if(meta?.message) el.meta.textContent = meta.message;
  const hist = await getJSON(paths.history, {weeks:[]});
  current    = await getJSON(paths.current, null);
  if(!current){ el.tbl.innerHTML='<div class="row"><div class="k">current.json missing. Put one under ./data/nfl/current.json</div></div>'; return; }
  renderArchive(hist);
  fillWeekDropdown(hist, current);
  bind();
  renderWeek(current);
})();

