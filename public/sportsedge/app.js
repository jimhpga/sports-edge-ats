const $ = (s)=>document.querySelector(s);
const weekEl=$("#thisWeek"), seasonEl=$("#season"), archiveEl=$("#archive"), metaEl=$("#meta");
async function loadJSON(path,fallback){try{const r=await fetch(path,{cache:"no-store"});if(!r.ok)throw new Error(r.statusText);return await r.json()}catch(e){return fallback}}
function dot(c){return c==="green"?'<span class="dot g"></span>':c==="yellow"?'<span class="dot y"></span>':'<span class="dot r"></span>'}
function renderWeek(w){ if(!w||!w.games||!w.games.length){ weekEl.innerHTML='<p class="small">No picks yet. Update /public../data/nfl/current.json?v=638980142647147853</p>'; return;}
  const rows=w.games.map(g=>`<div class="row"><div class="team">${g.away} @ ${g.home} <span class="small">(${g.kickoff||"TBD"})</span></div><div class="edge">${dot(g.color)} ${g.recommendation} <span class="small">${g.market} ${g.line??""} | Model: ${g.model??""}</span></div></div>`).join("");
  weekEl.innerHTML=`<div class="h"><div><strong>Week ${w.week} • ${w.season}</strong> <span class="badge">${w.record?.summary||"—"}</span></div><div class="tag">Update: ${w.updated||"—"}</div></div>${rows}`;
}
function renderSeason(h){ if(!h||!h.weeks) return;
  seasonEl.innerHTML = h.weeks.slice(-8).reverse().map(w=>`<div class="week"><div class="h"><strong>W${w.week} ${w.season}</strong><span class="badge">${w.record.summary}</span></div><div class="small">G ${w.record.green} • Y ${w.record.yellow} • R ${w.record.red}</div><div class="small"><a class="code" href="/data/nfl/${w.season}-w${String(w.week).padStart(2,"0")}.json">open JSON</a></div></div>`).join("");
}
function renderArchive(h){ if(!h||!h.weeks) return;
  archiveEl.innerHTML = h.weeks.map(w=>`<div class="week"><div class="h"><strong>W${w.week} ${w.season}</strong><span class="badge">${w.record.summary}</span></div><div class="small">G ${w.record.green} • Y ${w.record.yellow} • R ${w.record.red}</div><div class="small"><a class="code" href="/data/nfl/${w.season}-w${String(w.week).padStart(2,"0")}.json">open JSON</a></div></div>`).join("");
}
(async function init(){
  const meta = await loadJSON('../data/meta.json?v=638980142647112692', {});
  if(meta&&meta.message) metaEl.textContent = meta.message;
  const current = await loadJSON('../data/nfl/current.json?v=638980142647147853', null);
  const history = await loadJSON('../data/nfl/history.json?v=638980142647157896', {weeks:[]});
  renderWeek(current); renderSeason(history); renderArchive(history);
})();


