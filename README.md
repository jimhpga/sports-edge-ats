# Sports Edge – Mobile PWA v3
Final MVP with Week Switcher, ROI bars, Edge Finder, Bankroll Simulator, Themes, Print-to-PDF.

## Deploy
- Drag this folder into Vercel → New Project → Deploy.
- Open on phone → Share → Add to Home Screen.
- Weeks are loaded from /data/week-XX.json (01..18).

## Updating Data
- Replace files in /data with your weekly JSON.
- Or use the Import tab to load a week JSON on-device.
- Export → "Export Current Data (JSON)" to save edits.

## Features
- Home (Sortable): sort by headers; filter by day/color/type/weather; search teams.
- Picks & Results: color-coded legs, $ P/L, bankroll after.
- Week Switcher: ◀︎ ▶︎ + dropdown, auto-loads week JSON.
- ROI Leaderboard: ATS / ML / O/U ROI tiles from graded results.
- Edge Finder: shows only green-qualified rows.
- Bankroll Simulator: quick projection (uses current Season ROI).
- Themes: Midnight, Neon Edge, Gridiron Gray.
- PDF Export: One-tap (uses print stylesheet) → Save as PDF.

## JSON Shape
See data/week-01.json for the exact schema expected.
