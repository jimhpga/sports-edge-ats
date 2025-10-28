import streamlit as st
import pandas as pd
import numpy as np
from pathlib import Path

# ------------------
# PAGE CONFIG / THEME
# ------------------
st.set_page_config(
    page_title="Edge Report",
    layout="wide"
)

# Dark gradient BG and better card styles
st.markdown("""
<style>
/* page bg */
[data-testid="stAppViewContainer"] {
    background: radial-gradient(circle at 20% 20%, #1a1f2e 0%, #000000 80%);
    color: #ffffff;
    font-family: 'Inter', system-ui, sans-serif;
}

/* sidebar bg */
section[data-testid="stSidebar"] {
    background: #0f131d !important;
    border-right: 1px solid rgba(255,255,255,0.08);
}
section[data-testid="stSidebar"] * {
    color: #fff !important;
}

/* headers */
h1,h2,h3,h4,h5,h6 {
    color: #fff !important;
    font-weight: 600;
    letter-spacing: -0.03em;
}

/* table tweaks */
.dataframe td, .dataframe th {
    color: #ffffff !important;
    background-color: #1c253a !important;
    border-color: #2c344d !important;
    font-size: 0.85rem;
}

/* info boxes (the summary cards) */
.stat-card {
    flex:1 1 220px;
    border-radius:16px;
    padding:16px 20px;
    box-shadow:0 20px 50px rgba(0,0,0,0.6);
    min-width:220px;
}
.stat-label {
    font-size:0.8rem;
    font-weight:600;
    text-transform:uppercase;
    letter-spacing:.08em;
    margin-bottom:4px;
}
.stat-value {
    color:#fff;
    font-size:1.1rem;
    font-weight:600;
    line-height:1.2;
    letter-spacing:-0.03em;
}
</style>
""", unsafe_allow_html=True)


# ------------------
# LOAD DATA HELPERS
# ------------------

@st.cache_data
def load_league_csv(path, league_name):
    """
    Load one league's picks.csv (NFL, NBA, MLB, etc.)
    and normalize to standard columns so we can merge.
    """
    p = Path(path)
    if not p.exists():
        return pd.DataFrame()

    df = pd.read_csv(p)

    # --- date ---
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
    else:
        df["date"] = pd.NaT

    # --- league ---
    df["league"] = league_name

    # --- final score ---
    if "home_score" in df.columns and "away_score" in df.columns:
        df["final_score"] = (
            df["away_score"].astype(str)
            + " - " +
            df["home_score"].astype(str)
        )
    else:
        df["final_score"] = ""

    # --- who we backed (side) ---
    # side should be "home"/"away" from backtest_ats
    pick_side = df.get("side", pd.Series(["home"] * len(df)))
    df["team_pick"] = np.where(
        pick_side == "home",
        df.get("home", "HOME"),
        df.get("away", "AWAY")
    )
    df["opponent"] = np.where(
        pick_side == "home",
        df.get("away", "AWAY"),
        df.get("home", "HOME")
    )
    df["H/A"] = np.where(pick_side == "home", "H", "A")

    # --- EV to % ---
    df["EV_pct"] = (df.get("EV", 0.0) * 100.0).round(1)

    # --- Win/Loss result ---
    # backtest_ats sets y = 1 if that bet cashes
    if "y" in df.columns:
        df["result"] = np.where(df["y"] == 1, "WIN", "LOSS")
    else:
        df["result"] = ""

    # --- Build human-readable betting line / odds ---
    # We assume spreads for now (we'll extend for moneylines/totals later)
    # close_spread is from HOME perspective
    # home_spread_odds and away_spread_odds are American odds
    ho_spread = df.get("close_spread", pd.Series([np.nan] * len(df)))
    ho_price = df.get("home_spread_odds", pd.Series([np.nan] * len(df)))
    aw_price = df.get("away_spread_odds", pd.Series([np.nan] * len(df)))

    def fmt_odds(o):
        if pd.isna(o):
            return ""
        o_int = int(o)
        return f"+{o_int}" if o_int > 0 else f"{o_int}"

    def fmt_spread(spread_val, side_is_home):
        if pd.isna(spread_val):
            return ""
        # spread_val is from home perspective.
        # If we are backing home, use that number as-is (like -3.5).
        # If we are backing away, flip it.
        return f"{(spread_val if side_is_home else -spread_val):+}"

    line_label = []
    for i in range(len(df)):
        side_is_home = (pick_side.iloc[i] == "home") if i < len(pick_side) else True
        spread_here = ho_spread.iloc[i] if i < len(ho_spread) else np.nan
        price_here = ho_price.iloc[i] if side_is_home else (
            aw_price.iloc[i] if i < len(aw_price) else np.nan
        )

        spread_txt = fmt_spread(spread_here, side_is_home)
        odds_txt = fmt_odds(price_here)
        if spread_txt == "" and odds_txt == "":
            line_label.append("")
        else:
            line_label.append(f"{spread_txt} ({odds_txt})")

    df["market_line"] = line_label

    # --- day/week convenience ---
    df["day"] = df["date"].dt.date.astype("string")

    if "week" not in df.columns:
        df["week"] = ""

    # Define clean presentation order
    preferred_cols = [
        "league",
        "week",
        "day",
        "team_pick",
        "H/A",
        "opponent",
        "market_line",
        "tier",
        "EV_pct",
        "result",
        "final_score",
    ]

    # Some of those might not exist yet in certain leagues — filter
    cols_existing = [c for c in preferred_cols if c in df.columns]

    # Now append extras (so we don't lose anything from raw file)
    other_cols = [c for c in df.columns if c not in cols_existing]
    df = df[cols_existing + other_cols]

    return df


@st.cache_data
def load_all_data():
    """
    Try to load all league CSVs.
    If NBA/MLB/UFC aren't ready yet, they'll just be empty.
    """
    dfs = []
    dfs.append(load_league_csv("data/nfl/picks.csv", "NFL"))
    dfs.append(load_league_csv("data/nba/picks.csv", "NBA"))
    dfs.append(load_league_csv("data/mlb/picks.csv", "MLB"))
    dfs.append(load_league_csv("data/ufc/picks.csv", "UFC"))

    dfs = [d for d in dfs if not d.empty]

    if len(dfs) == 0:
        return pd.DataFrame()

    out = pd.concat(dfs, ignore_index=True)

    # Coerce types for safety
    if "EV_pct" in out.columns:
        out["EV_pct"] = pd.to_numeric(out["EV_pct"], errors="coerce")

    if "day" in out.columns:
        # We'll keep "day" as text (YYYY-MM-DD), but let's also
        # store a real datetime version for filtering.
        out["_day_dt"] = pd.to_datetime(out["day"], errors="coerce")

    # Normalize tier casing (Green/Yellow/Red)
    if "tier" in out.columns:
        out["tier"] = out["tier"].astype(str).str.title()

    # Normalize league label (NFL / NBA / MLB / UFC)
    out["league"] = out["league"].astype(str).str.upper()

    return out


df = load_all_data()

st.markdown(
    "<h1 style='color:#fff;font-size:1.4rem;font-weight:600;line-height:1.2;letter-spacing:-0.04em;margin-bottom:0.5rem;'>"
    "Edge Report / Pick Quality"
    "</h1>"
    "<div style='color:#8b94ff;font-size:0.8rem;font-weight:500;margin-bottom:1.5rem;'>"
    "Filter by league, tier, date, or NFL week. See best edges and how they performed."
    "</div>",
    unsafe_allow_html=True
)

if df.empty:
    st.error("No data found. Make sure picks.csv exists in data/nfl (and others later).")
    st.stop()

# ------------------
# SIDEBAR FILTERS
# ------------------

st.sidebar.markdown("### Filters")

# League filter
leagues_available = ["ALL"] + sorted(df["league"].dropna().unique().tolist())
league_choice = st.sidebar.selectbox("League", leagues_available)

filtered = df.copy()
if league_choice != "ALL":
    filtered = filtered[filtered["league"] == league_choice]

# Tier filter
if "tier" in filtered.columns:
    tiers_available = ["ALL"] + sorted(filtered["tier"].dropna().unique().tolist())
else:
    tiers_available = ["ALL"]

tier_choice = st.sidebar.selectbox("Tier (confidence)", tiers_available)
if tier_choice != "ALL" and "tier" in filtered.columns:
    filtered = filtered[filtered["tier"] == tier_choice]

# Date range filter (by game day)
if "_day_dt" in filtered.columns:
    min_day = pd.to_datetime(filtered["_day_dt"], errors="coerce").min()
    max_day = pd.to_datetime(filtered["_day_dt"], errors="coerce").max()
else:
    min_day = pd.to_datetime("2020-01-01")
    max_day = pd.to_datetime("today")

date_range = st.sidebar.date_input(
    "Date range",
    value=(min_day.date(), max_day.date())
)

if isinstance(date_range, tuple) and len(date_range) == 2:
    start_d, end_d = date_range
    mask = (filtered["_day_dt"] >= pd.to_datetime(start_d)) & \
           (filtered["_day_dt"] <= pd.to_datetime(end_d))
    filtered = filtered[mask]

# Week filter (mainly NFL). Only show if there's real data.
if "week" in filtered.columns:
    unique_weeks = [w for w in filtered["week"].astype(str).unique().tolist() if w.strip() != ""]
    if len(unique_weeks) > 0:
        week_choice = st.sidebar.selectbox("NFL Week", ["ALL"] + sorted(unique_weeks, key=lambda x: (len(x), x)))
        if week_choice != "ALL":
            filtered = filtered[filtered["week"].astype(str) == str(week_choice)]

# ------------------
# SUMMARY CARDS
# ------------------

# record W-L
if "result" in filtered.columns and not filtered.empty:
    wins = int((filtered["result"] == "WIN").sum())
    losses = int((filtered["result"] == "LOSS").sum())
    wl_text = f"{wins}-{losses}"
else:
    wl_text = "N/A"

# avg EV
if "EV_pct" in filtered.columns and not filtered.empty:
    avg_ev = filtered["EV_pct"].mean()
    ev_text = f"{avg_ev:.1f}%"
else:
    ev_text = "N/A"

# active filters label
filters_text = f"League: {league_choice} | Tier: {tier_choice}"

st.markdown(f"""
<div style="display:flex;flex-wrap:wrap;gap:1rem;">

  <div class="stat-card" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);">
    <div class="stat-label" style="color:#8b94ff;">Active Filter</div>
    <div class="stat-value">{filters_text}</div>
  </div>

  <div class="stat-card" style="background:rgba(0,255,135,0.07);border:1px solid rgba(0,255,135,0.3);">
    <div class="stat-label" style="color:#00ff87;">Record (Filtered)</div>
    <div class="stat-value">{wl_text}</div>
  </div>

  <div class="stat-card" style="background:rgba(255,206,107,0.08);border:1px solid rgba(255,206,107,0.4);">
    <div class="stat-label" style="color:#ffce6b;">Avg Edge (EV %)</div>
    <div class="stat-value">{ev_text}</div>
  </div>

</div>
""", unsafe_allow_html=True)

st.markdown("---")

# ------------------
# TOP OPPORTUNITIES (Green tier)
# ------------------

st.markdown(
    "<h2 style='color:#00ff87;font-weight:600;font-size:0.9rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:0.5rem;'>"
    "Top Opportunities (Green tier)"
    "</h2>"
    "<div style='color:#9debbf;font-size:0.8rem;margin-bottom:0.75rem;'>"
    "These are our best-rated edges in the filtered slice."
    "</div>",
    unsafe_allow_html=True
)

top_df = filtered.copy()
if "tier" in top_df.columns:
    top_df = top_df[top_df["tier"].str.lower() == "green"]

if "EV_pct" in top_df.columns:
    top_df = top_df.sort_values("EV_pct", ascending=False)

top_df = top_df.head(10)

if top_df.empty:
    st.info("No Green picks in this filter.")
else:
    show_cols = [c for c in [
        "league","week","day","team_pick","H/A","opponent",
        "market_line","EV_pct","result","final_score","tier"
    ] if c in top_df.columns]

    st.dataframe(
        top_df[show_cols],
        width=1400,
        height=280,
    )

st.markdown("---")

# ------------------
# ALL PICKS TABLE
# ------------------

st.markdown(
    "<h2 style='color:#8b94ff;font-weight:600;font-size:0.9rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:0.5rem;'>"
    "All Picks (Filtered Selection)"
    "</h2>"
    "<div style='color:#8b94ff;font-size:0.8rem;margin-bottom:0.75rem;'>"
    "Sorted by date and edge. This is the audit trail: what we liked, how strong it was, how it ended."
    "</div>",
    unsafe_allow_html=True
)

if filtered.empty:
    st.warning("No rows match your filters.")
else:
    show_cols = [c for c in [
        "league","week","day","team_pick","H/A","opponent",
        "market_line","tier","EV_pct","result","final_score"
    ] if c in filtered.columns]

    st.dataframe(
        filtered.sort_values(
            by=["_day_dt","EV_pct"],
            ascending=[False, False],
        )[show_cols],
        width=1400,
        height=500,
    )
