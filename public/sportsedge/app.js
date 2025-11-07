const qs = (s)=>document.querySelector(s);
const paths = { meta:'./data/meta.json', current:'./data/nfl/current.json', history:'./data/nfl/history.json' };
console.log('[SportsEdge] boot v11 paths=', paths);

const el = {
  tbl: qs('#table'), arch: qs('#archive'), headline: qs('#headline'),
  updated: qs('#updated'), pills: qs('#recordPills'),
  selWeek: qs('#selWeek'), selMarket: qs('#selMarket'), selColor: qs('#selColor'),
  txtSearch: qs('#txtSearch'), btnExport: qs('#btnExport'), btnShare: qs('#btnShare'), btnClear: qs('#btnClear')
};

async function getJSON(p, fb){ const u=p+'?t='+Date.now(); const r=await fetch(u,{cache:'no-store'}); if(!r.ok){console.warn('[fetch fail]',u,r.status); return fb;} return r.json(); }
const fmt=(n,d=1)=> (n==null||Number.isNaN(+n))?'—':(+n).toFixed(d);
const dot=(c)=> c==='green'?'<span class="dot g"></span>':c==='yellow'?'<span class="dot y"></span>':'<span class="dot r"></span>';
const koScore=(s)=>{ if(!s) return 0; const m=/([A-Za-z]{3})\s+(\d{1,2}):(\d{2})/i.exec(s); const order={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7}; return m?(order[m[1]]||0)*10000+(+m[2])*100+(+m[3]):Date.parse(s)||0; };
const head=()=><div class="thead"><div>Matchup</div><div class="hideM">Pick</div><div>Edge</div><div class="hideS">Model vs Line</div><div>Kickoff</div></div>;

function applyFilters(all){
  const m=el.selMarket.value, c=el.selColor.value, q=(el.txtSearch.value||'').toLowerCase();
  let out=[...(all||[])];
  if(m!=='all') out=out.filter(x=>(x.market||'').toLowerCase()===m);
  if(c!=='all') out=out.filter(x=>(x.color||'').toLowerCase()===c);
  if(q) out=out.filter(x=>(x.home||'').toLowerCase().includes(q)||(x.away||'').toLowerCase().includes(q)||(x.recommendation||'').toLowerCase().includes(q));
  out.sort((a,b)=>(+(b.edge||0))-(+(a.edge||0))||koScore(a.kickoff)-koScore(b.kickoff));
  return out;
}

function renderWeek(week){
  console.log('[renderWeek] games=', week.games?.length, week);
  el.headline.textContent = Week  • ;
  el.updated.textContent  = week.updated ? Updated  : '';
  const g=week.games.filter(x=>x.color==='green').length, y=week.games.filter(x=>x.color==='yellow').length, r=week.games.filter(x=>x.color==='red').length;
  el.pills.innerHTML = <span class="pill g">G </span><span class="pill y">Y </span><span class="pill r">R </span>;
  const rows=applyFilters(week.games||[]);
  el.tbl.innerHTML = head() + (rows.length? rows.map(g=>{const ml=${g.market||''} .trim(); const d=(g.model!=null&&g.line!=null)?fmt((+g.model)-(+g.line),1):'—'; return 
    <div class="row">
      <div><div class="pick">  @ </div><div class="note hideM"> <span class="k">()</span></div></div>
      <div class="hideM"><span class="pick"></span> <span class="k">()</span></div>
      <div><span class="badge "></span></div>
      <div class="hideS"><span class="k">Model:</span>  · <span class="k">Line:</span>  · <span class="k">Δ:</span> </div>
      <div></div>
    </div>; }).join('') : <div class="row"><div class="k">No picks in this view.</div></div>);
}

function renderArchive(history){
  el.arch.innerHTML = (history.weeks||[]).slice().reverse().map(w=>{
    const key=${w.season}-w;
    return <div class="weekCard"><div class="top"><strong>W </strong><span class="k">G  • Y  • R </span></div>
    <div><a class="btn" href="./data/nfl/.json">Open JSON</a> <button class="btn ghost" data-load="">Load Week</button></div></div>;
  }).join('');
  el.arch.addEventListener('click', async e=>{
    const b=e.target.closest('[data-load]'); if(!b) return;
    const key=b.getAttribute('data-load'); const wk=await getJSON(./data/nfl/.json,null);
    if(wk){ current=wk; renderWeek(current); el.selWeek.value=key; }
  });
}

function fillWeekDropdown(hist, cur){
  const keys=[...new Set((hist.weeks||[]).map(w=>${w.season}-w))].sort().reverse();
  el.selWeek.innerHTML = keys.map(k=>{ const [s,w]=k.split('-w'); const sel=(+s===cur.season&&+w===cur.week)?'selected':''; return <option value="" >W </option>; }).join('');
  el.selWeek.onchange = async ()=>{ const [s,w]=el.selWeek.value.split('-w'); const wk=await getJSON(./data/nfl/-w.json,null); if(wk){ current=wk; renderWeek(current); } };
}

function bind(){
  [el.selMarket, el.selColor].forEach(x=> x.onchange=()=>renderWeek(current));
  el.txtSearch.oninput = ()=>renderWeek(current);
  el.btnClear.onclick  = ()=>{ el.selMarket.value='all'; el.selColor.value='all'; el.txtSearch.value=''; renderWeek(current); };
  el.btnShare.onclick  = ()=>{ navigator.clipboard?.writeText(location.href); el.btnShare.textContent='Copied!'; setTimeout(()=>el.btnShare.textContent='Share',900); };
  el.btnExport.onclick = ()=>{
    const rows= (applyFilters(current.games||[]));
    const head=['home','away','market','line','model','edge','color','recommendation','kickoff'];
    const esc=(v)=>"";
    const csv=[head.join(','),...rows.map(r=>head.map(k=>esc(r[k])).join(','))].join('\r\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=\SportsEdge-W\-\.csv\; a.click();
  };
}

let current=null;
(async function init(){
  const hist = await getJSON(paths.history,{weeks:[]});
  current    = await getJSON(paths.current,null);
  console.log('[loaded] current?', !!current, 'games:', current?.games?.length);
  if(!current){ el.tbl.innerHTML='<div class="row"><div class="k">current.json missing under ./data/nfl/</div></div>'; return; }
  renderArchive(hist); fillWeekDropdown(hist,current); bind(); renderWeek(current);
})();
