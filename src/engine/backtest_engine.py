import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from scipy.stats import norm

STAKE = 100.0
SIGMA_PTS = 13.0


def implied_prob(odds):
    """
    Convert American odds to implied probability.
    """
    if odds > 0:
        return 100 / (100 + abs(odds))
    else:
        return abs(odds) / (100 + abs(odds))


def ats_result(row):
    """
    True (1) if our chosen side covers the spread, else False (0).
    We treat 'side' == 'home' to mean "betting home + close_spread",
    and 'side' == 'away' to mean "betting away - close_spread".
    """
    line = row["close_spread"]
    if row["side"] == "home":
        return (row["home_score"] + line) > row["away_score"]
    else:
        return (row["away_score"] - line) > row["home_score"]


def profit_usd(row):
    """
    Return profit/loss for this pick given STAKE dollars per bet.
    Uses American odds.
    """
    price = row["home_spread_odds"] if row["side"] == "home" else row["away_spread_odds"]

    if row["y"] == 1:
        # bet wins
        if price > 0:
            return STAKE * (price / 100.0)
        else:
            return STAKE * (100.0 / abs(price))
    else:
        # bet loses
        return -STAKE


def tier_from_ev(ev):
    """
    Tier the confidence by EV gap (model_p - breakeven_p).
    """
    if ev >= 0.07:
        return "Green"
    elif ev >= 0.03:
        return "Yellow"
    else:
        return "Red"


def backtest_ats(league, csv_path, out_dir):
    """
    Main backtest driver.

    Inputs:
      league    - string label like 'NFL', 'NBA'
      csv_path  - path to source lines/results CSV
      out_dir   - directory to write summary + picks + HTML report

    Returns:
      dict with paths and counts for the caller.
    """

    # Load data
    df = pd.read_csv(csv_path)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # Some datasets have "week", some don't.
    # We'll build sort columns dynamically.
    sort_cols = ["season", "date", "home"]
    if "week" in df.columns:
        sort_cols.insert(1, "week")

    # Clean/sort
    df = df.dropna(subset=["date"]).sort_values(sort_cols)

    # Human-readable matchup string
    df["event"] = df["away"] + "@" + df["home"]

    # If model_p missing, default to a boring 0.55 so code doesn't crash
    df["model_p"] = df.get("model_p", pd.Series([0.55] * len(df)))

    # Side: bet home if model_p >= 0.5 else away
    df["side"] = np.where(df["model_p"] >= 0.5, "home", "away")

    # American price we are "taking"
    df["price"] = np.where(
        df["side"] == "home",
        df["home_spread_odds"],
        df["away_spread_odds"]
    )

    # Breakeven probability implied by that price
    df["breakeven_p"] = df["price"].apply(implied_prob)

    # EV gap between our model and price
    df["EV"] = df["model_p"] - df["breakeven_p"]

    # Edge in "points" space, calibrated by SIGMA_PTS and direction of pick
    z = norm.ppf(np.clip(df["model_p"].values, 1e-6, 1 - 1e-6))
    df["model_edge_pts"] = (z * SIGMA_PTS) * np.where(df["side"] == "home", -1, 1)

    # Did that side cover?
    df["y"] = df.apply(ats_result, axis=1).astype(int)

    # P/L in dollars
    df["profit_USD"] = df.apply(profit_usd, axis=1).round(2)

    # Tier (Green / Yellow / Red)
    df["tier"] = df["EV"].apply(tier_from_ev)

    # Tag league for output files
    df["league"] = league

    # Prepare output directory
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    # -------------------------
    # Export picks (full detail)
    # -------------------------
    picks_path = out / "picks.csv"
    df[
        [
            "league",
            "season",
            *(["week"] if "week" in df.columns else []),
            "date",
            "event",
            "side",
            "close_spread",
            "home_spread_odds",
            "away_spread_odds",
            "model_p",
            "breakeven_p",
            "EV",
            "tier",
            "y",
            "profit_USD",
            "model_edge_pts",
        ]
    ].to_csv(picks_path, index=False)

    # -------------------------
    # Summary: by confidence tier
    # -------------------------
    s_conf = df.groupby("tier", as_index=False).agg(
        Bets=("y", "count"),
        Wins=("y", "sum"),
        Net_USD=("profit_USD", "sum"),
    )
    s_conf["Losses"] = s_conf["Bets"] - s_conf["Wins"]
    s_conf["Win%"] = (s_conf["Wins"] / s_conf["Bets"]).round(6)
    s_conf["ROI"] = (s_conf["Net_USD"] / (STAKE * s_conf["Bets"])).round(6)

    conf_path = out / "summary_by_confidence.csv"
    s_conf.to_csv(conf_path, index=False)

    # -------------------------
    # Summary: by season
    # -------------------------
    s_season = df.groupby("season", as_index=False).agg(
        Bets=("y", "count"),
        Wins=("y", "sum"),
        Losses=("y", lambda x: len(x) - x.sum()),
        Net_USD=("profit_USD", "sum"),
    )
    s_season["ROI"] = (s_season["Net_USD"] / (STAKE * s_season["Bets"])).round(6)

    seas_path = out / "summary_by_season.csv"
    s_season.to_csv(seas_path, index=False)

    # -------------------------
    # HTML report (quick look)
    # -------------------------
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

    <p>Generated: {now} &nbsp;&nbsp;|&nbsp;&nbsp;
    σ (calibrated) = {SIGMA_PTS:.2f} pts &nbsp;&nbsp;|&nbsp;&nbsp;
    Stake = ${STAKE:.0f}</p>

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
        "n_picks": int(len(df)),
    }
