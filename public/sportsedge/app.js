const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const qp = new URLSearchParams(location.search);
const fmt = (n, d=1) => (n===null||n===undefined||Number.isNaN(+n)) ? "—" : (+n).toFixed(d);

const metaEl   = document.querySelector("#meta");
const weekEl   = document.querySelector("#thisWeek");
const archEl   = document.querySelector("#archive");
const titleWEl = document.querySelector("#titleWeek");
const sumEl    = document.querySelector("#summary");

const selWeek   = document.querySelector("#selWeek");
const selMarket = document.querySelector("#selMarket");
const selColor  = document.querySelector("#selColor");
const selSort   = document.querySelector("#selSort");
const txtSearch = document.querySelector("#txtSearch");
const btnShare  = document.querySelector("#btnShare");
const btnExport = document.querySelector("#btnExport");
const btnClear  = document.querySelector("#btnClear");

const paths = {
  meta:    "./data/meta.json",
  current: "./data/nfl/current.json",
  history: "./data/nfl/history.json"
};

async function j(path, fallback){
  try{ const r = await fetch(path, {cache:"no-store"}); if(!r.ok) throw new Error(r.statusText); return await r.json(); }
  catch(e){ return fallback; }
}
const dot = (c) => c==="green" ? '<span class="dot g"></span>' :
                    c==="yellow"? '<span class="dot y"></span>' :
                                  '<span class="dot r"></span>';

function parseKickoff(str){
  if(!str) return null;
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const m = /([A-Za-z]{3})\s+(\d{1,2}):(\d{2})/i.exec(str);
  if(m){ return days.indexOf(m[1].substr(0,3)) * 10000 + (+m[2])*100 + (+m[3]); }
  const t = Date.parse(str);
  return Number.isNaN(t) ? null : t;
}

function toCSV(rows){
  const head = ["home","away","market","line","model","edge","color","recommendation","kickoff"];
  const esc = (v)=> `"${String(v??"").replaceAll('"','""')}"`;
  return [head.join(","), ...rows.map(r => head.map(k=>esc(r[k])).join(","))].join("\r\n");
}

function renderControls(weeks, currentWeek){
  const unique = [];
  weeks.slice().sort((a,b)=> (a.season-b.season) || (a.week-b.week))
    .forEach(w=>{
      const key = `${w.season}-w${String(w.week).padStart(2,"0")}`;
      if(!unique.includes(key)) unique.push(key);
    });
  selWeek.innerHTML = unique.reverse().map(k=>{
    const [season, wk] = k.split("-w");
    const isCur = (+season===currentWeek.season && +wk===currentWeek.week);
    const label = `W${+wk} ${season}`;
    return `<option value="${season}-w${wk}" ${isCur?'selected':''}>${label}</option>`;
  }).join("");

  if(qp.get("market")) selMarket.value = qp.get("market");
  if(qp.get("color"))  selColor.value  = qp.get("color");
  if(qp.get("sort"))   selSort.value   = qp.get("sort");
  if(qp.get("q"))      txtSearch.value = qp.get("q");
}

function applyFilters(rows){
  let out = rows.slice();
  const market = selMarket.value;
  const color  = selColor.value;
  const q      = (txtSearch.value||"").trim().toLowerCase();

  if(market !== "all") out = out.filter(r => (r.market||"").toLowerCase()===market);
  if(color  !== "all") out = out.filter(r => (r.color||"").toLowerCase()===color);
  if(q) out = out.filter(r => (
    (r.home||"").toLowerCase().includes(q) ||
    (r.away||"").toLowerCase().includes(q) ||
    (r.recommendation||"").toLowerCase().includes(q)
  ));

  switch(selSort.value){
    case "edgeAsc":      out.sort((a,b)=> (+a.edge||0) - (+b.edge||0)); break;
    case "kickoffAsc":   out.sort((a,b)=> (parseKickoff(a.kickoff)||0) - (parseKickoff(b.kickoff)||0)); break;
    case "kickoffDesc":  out.sort((a,b)=> (parseKickoff(b.kickoff)||0) - (parseKickoff(a.kickoff)||0)); break;
    case "alpha":        out.sort((a,b)=> (a.home+a.away).localeCompare(b.home+b.away)); break;
    default:             out.sort((a,b)=> (+b.edge||0) - (+a.edge||0));
  }
  return out;
}

function renderWeek(week){
  titleWEl.textContent = `Week ${week.week} • ${week.season}`;
  const all = week.games || [];
  const rows = applyFilters(all);
  const g = rows.filter(r=>r.color==="green").length;
  const y = rows.filter(r=>r.color==="yellow").length;
  const r = rows.filter(r=>r.color==="red").length;
  sumEl.innerHTML = `Showing <b>${rows.length}</b> of ${all.length} • <span class="badge g">G ${g}</span> <span class="badge y">Y ${y}</span> <span class="badge r">R ${r}</span>`;

  const head = `<div class="thead"><div>Matchup</div><div class="hideM">Pick</div><div>Edge</div><div class="hideS">Model vs Line</div><div class="hideM">Kickoff</div></div>`;
  const html = rows.map(gm => {
    const ml = `${gm.market||""} ${gm.line??""}`.trim();
    const delta = (gm.model!==undefined && gm.line!==undefined) ? fmt((+gm.model) - (+gm.line),1) : "—";
    const ko = gm.kickoff || "TBD";
    return `
      <div class="row">
        <div>
          <div class="pick">${dot(gm.color)} ${gm.away} @ ${gm.home}</div>
          <div class="note hideM">${gm.recommendation||""} <span class="k">(${ml})</span></div>
        </div>
        <div class="hideM"><span class="pick">${gm.recommendation||""}</span> <span class="k">(${ml})</span></div>
        <div><span class="badge ${gm.color||""}">${fmt(gm.edge,1)}</span></div>
        <div class="hideS"><span class="k">Model:</span> ${fmt(gm.model,1)} &nbsp; <span class="k">Line:</span> ${fmt(gm.line,1)} &nbsp; <span class="k">Δ:</span> ${delta}</div>
        <div class="hideM">${ko}</div>
      </div>
    `;
  }).join("");
  weekEl.innerHTML = head + (html || `<p class="small">No games in this view.</p>`);
}

function renderArchive(history){
  const cards = (history.weeks||[]).slice().reverse().map(w=>{
    const key = `${w.season}-w${String(w.week).padStart(2,"0")}`;
    return `
      <div class="week">
        <div class="h">
          <strong>W${w.week} ${w.season}</strong>
          <span class="badge">G ${w.record.green} • Y ${w.record.yellow} • R ${w.record.red}</span>
        </div>
        <div class="small"><a class="tag" href="./data/nfl/${key}.json">open JSON</a></div>
        <button class="btn" data-goto="${key}">Load Week</button>
      </div>
    `;
  }).join("");
  archEl.innerHTML = cards;
  archEl.addEventListener("click", async (e)=>{
    const btn = e.target.closest("button[data-goto]");
    if(!btn) return;
    const key = btn.getAttribute("data-goto");
    const wk = await j(`./data/nfl/${key}.json`, null);
    if(wk){ renderWeek(wk); selWeek.value = key; pushURL(); }
  });
}

function pushURL(){
  const key = selWeek.value; const [season, wk] = key.split("-w");
  const params = new URLSearchParams({
    week: wk, season, market: selMarket.value, color: selColor.value, sort: selSort.value, q: txtSearch.value
  });
  history.replaceState(null, "", `?${params.toString()}`);
}

function bindEvents(allWeeks, currentWeek){
  const handle = () => { pushURL(); renderWeek(currentWeek); };
  [selMarket, selColor, selSort].forEach(el => el.addEventListener("change", handle));
  txtSearch.addEventListener("input", handle);
  selWeek.addEventListener("change", async ()=>{
    const [season, wk] = selWeek.value.split("-w"); 
    const wkJson = await j(`./data/nfl/${season}-w${wk}.json`, null);
    if(wkJson){ currentWeek.season = +season; currentWeek.week = +wk; currentWeek.games = wkJson.games; currentWeek.record = wkJson.record; currentWeek.updated = wkJson.updated; }
    pushURL(); renderWeek(currentWeek);
  });

  btnClear.addEventListener("click", ()=>{
    selMarket.value="all"; selColor.value="all"; selSort.value="edgeDesc"; txtSearch.value=""; pushURL(); renderWeek(currentWeek);
  });
  btnShare.addEventListener("click", ()=>{
    navigator.clipboard?.writeText(location.href); btnShare.textContent="Copied!"; setTimeout(()=>btnShare.textContent="Share",1000);
  });
  btnExport.addEventListener("click", ()=>{
    const rows = applyFilters(currentWeek.games||[]);
    const blob = new Blob([toCSV(rows)], {type:"text/csv"});
    const a = Object.assign(document.createElement("a"), {href:URL.createObjectURL(blob), download:`sportsedge-week${currentWeek.week}-${currentWeek.season}.csv`});
    document.body.appendChild(a); a.click(); a.remove();
  });
}

(async function init(){
  const meta = await j(paths.meta, {});
  if(meta?.message) metaEl.textContent = meta.message;

  const current = await j(paths.current, null);
  const historyJson = await j(paths.history, {weeks:[]});
  if(!current){ weekEl.innerHTML = '<p class="small">No current.json found. Put one under ./data/nfl/current.json</p>'; return; }

  renderControls(historyJson.weeks||[], {season: current.season, week: current.week});
  renderWeek(current);
  renderArchive(historyJson);
  bindEvents(historyJson.weeks||[], current);
})();
