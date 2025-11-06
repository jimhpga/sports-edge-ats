/* Sports Edge v3 app.js */
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

const picksView = $("#view-picks");
const resultsView = $("#view-results");
const homeTableBody = $("#home-table tbody");
const bankrollEl = $("#bankroll");
const weekRoiEl = $("#weekRoi");
const seasonRoiEl = $("#seasonRoi");
const spark = document.getElementById("spark").getContext("2d");
const tabs = $$(".tab");
const roiBars = $("#roiBars");
const weekSwitcher = $("#weekSwitcher");
const prevWeekBtn = $("#prevWeek");
const nextWeekBtn = $("#nextWeek");

const fDay = $("#filter-day");
const fWeather = $("#filter-weather");
const fSearch = $("#filter-search");

const themeChips = $$(".chip");

const simodal = $("#simodal");
const simBtn = $("#simBtn");
const simClose = $("#simClose");
const simRun = $("#simRun");
const simStart = $("#simStart");
const simUnit = $("#simUnit");
const simOut = $("#simOut");

const edgeBtn = $("#edgeBtn");
let edgeMode = false;

const pdfBtn = $("#pdfBtn");

let state = {
  bankroll: 0, weekRoi: null, seasonRoi: null, sparkline: [],
  picks: [], results: [], homeRows: [], sortKey: "week", sortAsc: true,
  week: 1, weeksAvailable: [1,2],
  byWeekData: {}
};

const weatherIcon = (tag)=>{
  const map = { "Windy":"🌬", "Rain/Snow":"🌧", "Dome":"🏟", "Cold":"❄️", "Hot":"🔥", "Clear":"☀️" };
  return map[tag] || "☀️";
};

function colorPill(c){ return c==='green'?'pill g':c==='yellow'?'pill y':c==='red'?'pill r':'pill'; }

function setTheme(t){
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("seTheme", t);
}
themeChips.forEach(ch=>ch.addEventListener("click", ()=>{
  themeChips.forEach(x=>x.classList.remove("active"));
  ch.classList.add("active");
  setTheme(ch.dataset.theme);
}));
setTheme(localStorage.getItem("seTheme")||"midnight");
themeChips.forEach(c=>{ if(c.dataset.theme===localStorage.getItem("seTheme")) c.classList.add("active"); });

function setBankroll(){
  bankrollEl.textContent = `$${Number(state.bankroll||0).toFixed(2)}`;
  weekRoiEl.textContent = state.weekRoi==null?'—':`${(state.weekRoi*100).toFixed(1)}%`;
  seasonRoiEl.textContent = state.seasonRoi==null?'—':`${(state.seasonRoi*100).toFixed(1)}%`;
}
function drawSparkline(data){
  const ctx = spark;
  const w = spark.canvas.width = spark.canvas.clientWidth;
  const h = spark.canvas.height = spark.canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  if(!data || !data.length){ return; }
  const min = Math.min(...data), max = Math.max(...data), rng = Math.max(1, max-min);
  ctx.beginPath();
  data.forEach((v,i)=>{
    const x = (i/(data.length-1))*w;
    const y = h - ((v-min)/rng)*h;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.lineWidth = 2; ctx.strokeStyle = "#5bc0be"; ctx.stroke();
}

function computeRoiBars(){
  const agg = { ATS:{b:0,p:0}, ML:{b:0,p:0}, OU:{b:0,p:0} };
  (state.results||[]).forEach(r=>{
    (r.graded||[]).forEach(g=>{
      const key = g.type==="TOTAL"?"OU":g.type;
      agg[key].b += Math.abs(g.stake||100);
      agg[key].p += g.pnl||0;
    });
  });
  roiBars.innerHTML = Object.entries(agg).map(([k,v])=>{
    const roi = v.b? (v.p / v.b * 100) : 0;
    return `<div><div class="small">${k} ROI</div><div style="font-weight:800">${roi.toFixed(1)}%</div></div>`;
  }).join("");
}

function renderHome(){
  const allowedColors = $$(".f-color:checked").map(cb=>cb.value);
  const allowedTypes = $$(".f-type:checked").map(cb=>cb.value);
  const day = fDay.value.trim();
  const wx = fWeather.value.trim();
  const q = fSearch.value.trim().toLowerCase();

  let rows = [...(state.homeRows||[])];
  if(day) rows = rows.filter(r=>r.day===day);
  if(wx) rows = rows.filter(r=>r.weather===wx);
  if(q) rows = rows.filter(r=> (r.away.toLowerCase().includes(q) || r.home.toLowerCase().includes(q)) );

  if(edgeMode){
    rows = rows.filter(r=> (r.atsColor==="green" || r.mlColor==="green" || r.ouColor==="green"));
  }

  rows = rows.filter(r=>{
    const checks = [];
    if(allowedTypes.includes("ATS") && r.atsColor) checks.push(allowedColors.includes(r.atsColor));
    if(allowedTypes.includes("ML")  && r.mlColor)  checks.push(allowedColors.includes(r.mlColor));
    if(allowedTypes.includes("OU")  && r.ouColor)  checks.push(allowedColors.includes(r.ouColor));
    return checks.length ? checks.some(Boolean) : true;
  });

  const k = state.sortKey, asc = state.sortAsc?1:-1;
  rows.sort((a,b)=>{
    let va = a[k], vb = b[k];
    if(k==="week"){ va = Number(va||0); vb = Number(vb||0); return (va - vb)*asc; }
    if(k==="color"){
      const rank = c => c==="green"?3:c==="yellow"?2:c==="red"?1:0;
      return (rank(a.color)-rank(b.color))*asc;
    }
    return String(va||"").localeCompare(String(vb||""), undefined, {numeric:true})*asc;
  });

  homeTableBody.innerHTML = rows.map(r=>`
    <tr>
      <td>${r.week}</td>
      <td>${r.date}</td>
      <td>${r.day}</td>
      <td>${r.away}</td>
      <td>${r.home}</td>
      <td>${r.atsLine?`${r.atsLine} <span class="${colorPill(r.atsColor)}">${(r.atsColor||'').toUpperCase()}</span>`:'—'}</td>
      <td>${r.mlPrice?`${r.mlPrice} <span class="${colorPill(r.mlColor)}">${(r.mlColor||'').toUpperCase()}</span>`:'—'}</td>
      <td>${r.ouLine?`${r.ouLine} <span class="${colorPill(r.ouColor)}">${(r.ouColor||'').toUpperCase()}</span>`:'—'}</td>
      <td><span class="${colorPill(r.color)}">${(r.color||'').toUpperCase()}</span></td>
      <td>${r.weather?`${weatherIcon(r.weather)} <span class="pill wtag">${r.weather}</span>`:'—'}</td>
    </tr>
  `).join("");
}

function renderPicks(){
  picksView.innerHTML = (state.picks||[]).map(p => `
    <div class="card" style="padding:10px">
      <div><b>${p.away}</b> @ <b>${p.home}</b> — ${weatherIcon(p.weatherTag||'')} <span class="pill wtag">${p.weatherTag||'—'}</span></div>
      <div class="small">ATS ${p.ats?.line??'—'} <span class="${colorPill(p.ats?.color)}">${(p.ats?.color||'').toUpperCase()}</span>
      &nbsp; | ML ${p.ml?.price??'—'} <span class="${colorPill(p.ml?.color)}">${(p.ml?.color||'').toUpperCase()}</span>
      &nbsp; | O/U ${p.total?.line??'—'} <span class="${colorPill(p.total?.color)}">${(p.total?.color||'').toUpperCase()}</span></div>
    </div>
  `).join("");
}

function renderResults(){
  resultsView.innerHTML = (state.results||[]).map(r => `
    <div class="card" style="padding:10px">
      <div><b>${r.away}</b> @ <b>${r.home}</b> — Final ${r.final}</div>
      <div class="small">${(r.graded||[]).map(g=>`${g.type} ${g.pick} ${g.result} ${g.pnl>=0?`(+${g.pnl})`:`(${g.pnl})`}`).join(" • ")}</div>
      <div class="small">Bankroll after: $${Number(r.bankrollAfter||0).toFixed(2)}</div>
    </div>
  `).join("");
}

function renderAll(){
  setBankroll();
  drawSparkline(state.sparkline||[]);
  computeRoiBars();
  renderHome();
  renderPicks();
  renderResults();
  renderWeekSwitcher();
}

$$('#home-table thead th').forEach(th=>{
  th.addEventListener('click', ()=>{
    const key = th.dataset.key;
    if(state.sortKey===key){ state.sortAsc = !state.sortAsc; }
    else { state.sortKey = key; state.sortAsc = true; }
    renderHome();
  });
});

[fDay, fWeather, fSearch, ...$$('.f-color'), ...$$('.f-type')].forEach(el=>{
  el.addEventListener('input', renderHome);
});

edgeBtn.addEventListener("click", ()=>{ edgeMode = !edgeMode; edgeBtn.classList.toggle("active", edgeMode); renderHome(); });

simBtn.addEventListener("click", ()=>{ simodal.style.display="flex"; });
simClose.addEventListener("click", ()=>{ simodal.style.display="none"; });
simRun.addEventListener("click", ()=>{
  const start = Number(simStart.value||0);
  const unit = Number(simUnit.value||100);
  const seasonRoi = state.seasonRoi || 0;
  const projected = start * (1 + seasonRoi);
  simOut.textContent = `If the current season ROI repeats on this bankroll, projected end would be ~$${projected.toFixed(2)} (unit $${unit}).`;
});

pdfBtn.addEventListener("click", ()=>{ window.print(); });

function renderWeekSwitcher(){
  const wks = state.weeksAvailable;
  weekSwitcher.innerHTML = wks.map(w=>`<option value="${w}" ${w===state.week?'selected':''}>Week ${w}</option>`).join("");
}
weekSwitcher.addEventListener("change", async (e)=>{
  const w = Number(e.target.value);
  await loadWeek(w);
});
prevWeekBtn.addEventListener("click", async ()=>{
  const idx = state.weeksAvailable.indexOf(state.week);
  if(idx>0) await loadWeek(state.weeksAvailable[idx-1]);
});
nextWeekBtn.addEventListener("click", async ()=>{
  const idx = state.weeksAvailable.indexOf(state.week);
  if(idx < state.weeksAvailable.length-1) await loadWeek(state.weeksAvailable[idx+1]);
});

function deriveHomeRowsFromPicks(picks){
  return (picks||[]).map(p=>({
    week: p.week||'—',
    date: p.date||'—',
    day: p.day||'—',
    away: p.away, home: p.home,
    atsLine: p.ats?.line||'', atsColor: p.ats?.color||'',
    mlPrice: p.ml?.price||'', mlColor: p.ml?.color||'',
    ouLine: p.total?.line||'', ouColor: p.total?.color||'',
    color: (p.ats?.color==='green'||p.ml?.color==='green'||p.total?.color==='green')?'green':
           ((p.ats?.color==='yellow'||p.ml?.color==='yellow'||p.total?.color==='yellow')?'yellow':(p.ats?.color||p.ml?.color||p.total?.color||'')),
    weather: p.weatherTag||''
  }));
}

async function loadWeek(week){
  const res = await fetch(`data/week-${String(week).padStart(2,'0')}.json`).then(r=>r.json());
  state.week = week;
  state.picks = res.picks||[];
  state.results = res.results||[];
  state.bankroll = res.bankroll||0;
  state.weekRoi = res.weekRoi||0;
  state.seasonRoi = res.seasonRoi||0;
  state.sparkline = res.sparkline||[];
  state.homeRows = res.homeRows||deriveHomeRowsFromPicks(state.picks);
  renderAll();
  localStorage.setItem("sportsEdgeDataWeek"+week, JSON.stringify(res));
}

function boot(){
  state.weeksAvailable = [1,2];
  loadWeek(1).catch(()=>renderAll());
}
boot();

document.getElementById("file").addEventListener("change", async (e)=>{
  const files = Array.from(e.target.files||[]);
  for (const f of files){
    const txt = await f.text();
    const json = JSON.parse(txt);
    const w = json.week||state.week;
    localStorage.setItem("sportsEdgeDataWeek"+w, JSON.stringify(json));
    if(!state.weeksAvailable.includes(w)) state.weeksAvailable.push(w);
  }
  state.weeksAvailable.sort((a,b)=>a-b);
  renderWeekSwitcher();
});
document.getElementById("exportBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify({
    week: state.week, bankroll: state.bankroll, weekRoi: state.weekRoi, seasonRoi: state.seasonRoi,
    sparkline: state.sparkline, picks: state.picks, results: state.results, homeRows: state.homeRows
  }, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sports-edge-week-${String(state.week).padStart(2,'0')}.json`;
  a.click();
});

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js');
  });
}