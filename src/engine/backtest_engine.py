import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path

STAKE = 100.0
SIGMA_PTS = 13.0

def implied_prob(odds):
    return 100 / (100 + abs(odds)) if odds > 0 else abs(odds) / (100 + abs(odds))

def ats_result(row):
    line = row["close_spread"]
    if row["side"] == "home":
        return row["home_score"] + line > row["away_score"]
    else:
        return row["away_score"] - line > row["home_score"]

def profit_usd(row):
    price = row["home_spread_odds"] if row["side"] == "home" else row["away_spread_odds"]
    return STAKE * (price / 100) if row["y"] == 1 and price > 0 else STAKE * (100 / abs(price)) if row["y"] == 1 else -STAKE

def tier_from_ev(ev):
    return "Green" if ev >= 0.07 else "Yellow" if ev >= 0.03 else "Red"

def backtest_ats(league, csv_path, out_dir):
    df = pd.read_csv(csv_path)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"]).sort_values(["season", "week", "date", "home"])
    df["event"] = df["away"] + "@" + df["home"]

    df["model_p"] = df.get("model_p", pd.Series([0.55]*len(df)))
    df["side"] = np.where(df["model_p"] >= 0.5, "home", "away")

    df["price"] = np.where(df["side"] == "home", df["home_spread_odds"], df["away_spread_odds"])
    df["breakeven_p"] = df["price"].apply(implied_prob)
    df["EV"] = df["model_p"] - df["breakeven_p"]

    from scipy.stats import norm
    z = norm.ppf(np.clip(df["model_p"].values, 1e-6, 1-1e-6))
    df["model_edge_pts"] = (z * SIGMA_PTS) * np.where(df["side"] == "home", -1, 1)

    df["y"] = df.apply(ats_result, axis=1).astype(int)
    df["profit_USD"] = df.apply(profit_usd, axis=1).round(2)
    df["tier"] = df["EV"].apply(tier_from_ev)

    df["league"] = league  # ✅ ADD this before export

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    picks_path = out / "picks.csv"
    df[["league", "season", "week", "date", "event", "side", "close_spread",
        "home_spread_odds", "away_spread_odds", "model_p", "breakeven_p",
        "EV", "tier", "y", "profit_USD", "model_edge_pts"]
    ].to_csv(picks_path, index=False)

    s_conf = (df.groupby("tier", as_index=False)
              .agg(Bets=("y", "count"),
                   Wins=("y", "sum"),
                   Net_USD=("profit_USD", "sum")))
    s_conf["Losses"] = s_conf["Bets"] - s_conf["Wins"]
    s_conf["Win%"] = (s_conf["Wins"] / s_conf["Bets"]).round(6)
    s_conf["ROI"] = (s_conf["Net_USD"] / (STAKE * s_conf["Bets"])).round(6)
    conf_path = out / "summary_by_confidence.csv"
    s_conf.to_csv(conf_path, index=False)

    s_season = (df.groupby("season", as_index=False)
                .agg(Bets=("y", "count"),
                     Wins=("y", "sum"),
                     Losses=("y", lambda x: len(x)-x.sum()),
                     Net_USD=("profit_USD", "sum")))
    s_season["ROI"] = (s_season["Net_USD"] / (STAKE * s_season["Bets"])).round(6)
    seas_path = out / "summary_by_season.csv"
    s_season.to_csv(seas_path, index=False)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    html = f"""<!doctype html><html><head><meta charset="utf-8">
    <title>{league} ATS Backtest</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 24px; background: #f5f8fa; }}
      table {{ border-collapse: collapse; width: 100%; margin: 10px 0; }}
      th, td {{ border: 1px solid #ddd; padding: 6px 8px; text-align: right; }}
      th {{ background:#f3f3f3; }}
      td:nth-child(1), th:nth-child(1) {{ text-align:left; }}
    </style></head><body>
    <h1>{league} ATS Backtest</h1>
    <p>Generated: {now} &nbsp;&nbsp;|&nbsp;&nbsp; σ (calibrated) = {SIGMA_PTS:.2f} pts &nbsp;&nbsp;|&nbsp;&nbsp; Stake = ${STAKE:.0f}</p>
    <h2>By Confidence Tier</h2>
    {s_conf.to_html(index=False)}
    <h2>By Season</h2>
    {s_season.to_html(index=False)}
    <h2>Picks (first 300)</h2>
    {df.head(300).to_html(index=False)}
    </body></html>"""
    (out / "report.html").write_text(html, encoding="utf-8")

    return {
        "picks_csv": str(picks_path),
        "confidence_csv": str(conf_path),
        "season_csv": str(seas_path),
        "report_html": str(out / "report.html"),
        "n_picks": int(len(df))
    }
