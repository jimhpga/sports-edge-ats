
# sports-edge-ats

﻿# Sports Edge ATS

Backtests against the spread (ATS) for NBA/MLB/UFC (NFL easy to add).
- Walk-forward logistic model by season
- Confidence tiers: EV$ → Low (red) / Moderate (yellow) / High (green)
- Outputs: picks & summaries (JSON/CSV) and a Streamlit dashboard

## Input schema (per league CSV in /inputs)
Required columns (lowercase headers):
date, season, home, away, home_score, away_score, close_spread

Optional numeric features (engine auto-uses them if present):
rest_diff, form_diff, travel, inj_diff, st_net, starter_xfip_diff, bullpen_fatigue,
striking_eff_diff, grappling_eff_diff, etc.

close_spread is from HOME perspective (negative = home favorite).
ba34066 (Initial commit of sports edge ATS model)
