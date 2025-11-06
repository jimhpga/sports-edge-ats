/*  /public/sportsedge/edge-live.js
 *  Sports Edge – Grid Enhancer (no build needed)
 *  - Pulls data from /api/sportsedge/update
 *  - Finds game rows on your grid page
 *  - Injects ML / ATS / O/U badges (GREEN / YELLOW / RED)
 *  - Auto refreshes every 90s
 */

/* =========================
   CONFIG — tweak if needed
   ========================= */
const CFG = {
  // API endpoint that returns { updatedAt, nfl: [...], ufc: [...] }
  endpoint: '/api/sportsedge/update',

  // Polling (ms)
  refreshMs: 90_000,

  // ====== DOM SELECTORS (adjust these if your DOM is different) ======
  // Each game row
  rowSel: 'table tbody tr',                // e.g. your grid table rows
  // Home team cell (text must include the home team name)
  homeSel: 'td:nth-child(6), .cell-home',
  // Away team cell (text must include the away team name)
  awaySel: 'td:nth-child(5), .cell-away',

  // The cells to inject badges into:
  atsCellSel: 'td:nth-child(7), .cell-ats',
  mlCellSel:  'td:nth-child(8), .cell-ml',
  ouCellSel:  'td:nth-child(9), .cell-ou',

  // Where to stamp the last update time (optional)
  headerStampSel: '#stamp, .page-stamp, h1 small',

  // Badge styles (class names used by this script)
  badgeClass: 'se-badge',
  badgeGreen: 'se-green',
  badgeYellow:'se-yellow',
  badgeRed:   'se-red'
};

/* =========================
   STYLES (auto-injected)
   ========================= */
(function injectStyles(){
  if (document.getElementById('se-enhancer-style')) return;
  const css = `
  .${CFG.badgeClass}{
    display:inline-block; padding:2px 8px; margin-left:6px;
    font-size:12px; border-radius:999px; line-height:1.8;
    font-weight:600; vertical-align:middle;
  }
  .${CFG.badgeGreen}{ background:#0f5132; color:#d1f2e0; }
  .${CFG.badgeYellow}{ background:#664d03; color:#fff1c2; }
  .${CFG.badgeRed}{ background:#842029; color:#ffd7d7; }
  .se-injected { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
  `;
  const el = document.createElement('style');
  el.id = 'se-enhancer-style';
  el.textContent = css;
  document.head.appendChild(el);
})();

/* =========================
   HELPERS
   ========================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function text(el) {
  return (el?.textContent || '').trim();
}

function badge(txt, tone) {
  const span = document.createElement('span');
  span.className = `${CFG.badgeClass} ${tone}`;
  span.textContent = txt;
  return span;
}

function toneByEdge(edge, g=1.2, y=0.7) {
  if (typeof edge !== 'number') return CFG.badgeRed;
  if (edge >= g) return CFG.badgeGreen;
  if (edge >= y) return CFG.badgeYellow;
  return CFG.badgeRed;
}

function normalizeName(s='') {
  return s.toLowerCase()
    .replace(/\s+/g,' ')
    .replace(/[^\w\s.-]/g,'')
    .trim();
}

function namesKey(away, home) {
  return `${normalizeName(away)}__${normalizeName(home)}`;
}

/* Build a quick lookup map:  key = "away__home" -> picks */
function buildPickMap(nfl=[]) {
  const map = new Map();
  nfl.forEach(g => {
    const key = namesKey(g.away_team||'', g.home_team||'');
    map.set(key, g.picks || {});
  });
  return map;
}

function ensureContainer(cell) {
  if (!cell) return null;
  let box = cell.querySelector('.se-injected');
  if (!box) {
    box = document.createElement('div');
    box.className = 'se-injected';
    // keep native text; we only append our box
    cell.appendChild(box);
  } else {
    // wipe previous badges
    box.textContent = '';
  }
  return box;
}

function setStamp(updatedAt) {
  const el = document.querySelector(CFG.headerStampSel);
  if (!el) return;
  try {
    const when = updatedAt ? new Date(updatedAt) : new Date();
    const parts = when.toLocaleString();
    const base = el.textContent?.replace(/· updated .*/,'').trim() || el.textContent || '';
    el.textContent = `${base ? base + ' ' : ''}· updated ${parts}`;
  } catch {}
}

/* =========================
   CORE: enhance the grid
   ========================= */
async function enhanceOnce() {
  let data;
  try {
    const r = await fetch(CFG.endpoint, { cache: 'no-store' });
    data = await r.json();
  } catch (e) {
    console.warn('[SE] fetch/update failed:', e);
    return;
  }

  const picks = buildPickMap(data?.nfl || []);
  setStamp(data?.updatedAt);

  const rows = document.querySelectorAll(CFG.rowSel);
  if (!rows.length) {
    return; // grid not yet present
  }

  rows.forEach(row => {
    const homeEl = row.querySelector(CFG.homeSel);
    const awayEl = row.querySelector(CFG.awaySel);
    if (!homeEl || !awayEl) return;

    const home = text(homeEl);
    const away = text(awayEl);
    const p = picks.get(namesKey(away, home));
    if (!p) return;

    // ML
    const mlCell = row.querySelector(CFG.mlCellSel);
    if (mlCell && p.ml?.pick) {
      const box = ensureContainer(mlCell);
      if (box) {
        const val = p.ml.value != null ? ` (${p.ml.value})` : '';
        box.appendChild(badge(`ML: ${p.ml.pick}${val}`, CFG.badgeGreen));
      }
    }

    // ATS
    const atsCell = row.querySelector(CFG.atsCellSel);
    if (atsCell && p.ats?.pick) {
      const box = ensureContainer(atsCell);
      if (box) {
        const e = typeof p.ats.edge_pts === 'number' ? p.ats.edge_pts : null;
        box.appendChild(badge(`ATS: ${p.ats.pick}${e!=null ? ` (${e})` : ''}`, toneByEdge(e, 1.2, 0.7)));
      }
    }

    // O/U
    const ouCell = row.querySelector(CFG.ouCellSel);
    if (ouCell && p.ou?.pick) {
      const box = ensureContainer(ouCell);
      if (box) {
        const e = typeof p.ou.edge_pts === 'number' ? p.ou.edge_pts : null;
        box.appendChild(badge(`O/U: ${p.ou.pick}${e!=null ? ` (${e})` : ''}`, toneByEdge(e, 1.5, 1.0)));
      }
    }
  });
}

/* =========================
   BOOT + REFRESH
   ========================= */
(async function boot(){
  await sleep(400);       // let the grid render
  enhanceOnce();          // first pass
  setInterval(enhanceOnce, CFG.refreshMs);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) enhanceOnce();
  });
})();