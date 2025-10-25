import streamlit as st
import pandas as pd
from datetime import date

st.set_page_config(
    page_title="Sports Edge Dashboard",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ----- Load Data -----
@st.cache_data

def load_data():
    try:
        df = pd.read_csv("data/nfl/picks.csv", parse_dates=["date"])
        return df
    except Exception as e:
        st.error(f"Error loading data: {e}")
        return pd.DataFrame()

df = load_data()

# ----- Sidebar -----
st.sidebar.header("📅 Filters")
if not df.empty:
    min_date, max_date = df["date"].min(), df["date"].max()
    start_date, end_date = st.sidebar.date_input(
        "Select Date Range",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date
    )
    df = df[(df["date"] >= pd.to_datetime(start_date)) & (df["date"] <= pd.to_datetime(end_date))]

    leagues = ["All"] + sorted(df["league"].dropna().unique().tolist())
    league = st.sidebar.selectbox("League", leagues)
    if league != "All":
        df = df[df["league"] == league]

# ----- Tabs Layout -----
st.title("🏈 Sports Edge — Picks & Profit Dashboard")
tabs = st.tabs(["📈 Summary", "✅ Top Picks", "📋 Full Table"])

# ----- Summary Tab -----
with tabs[0]:
    if df.empty:
        st.warning("No data available for the selected filters.")
    else:
        total_bets = len(df)
        wins = df["y"].sum()
        net_profit = df["profit_USD"].sum()
        roi = net_profit / (total_bets * 100) if total_bets else 0
        win_rate = wins / total_bets * 100 if total_bets else 0

        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total Bets", f"{total_bets}")
        col2.metric("Win %", f"{win_rate:.1f}%")
        col3.metric("Net Profit", f"${net_profit:,.2f}")
        col4.metric("ROI", f"{roi:.2%}")

# ----- Top Picks Tab -----
with tabs[1]:
    if df.empty:
        st.info("No picks available.")
    else:
        df_sorted = df.sort_values(["date", "EV"], ascending=[True, False]).copy()
        df_sorted["Top3"] = False

        for date_val, group in df_sorted.groupby("date"):
            top3_idx = group.nlargest(3, "EV").index
            df_sorted.loc[top3_idx, "Top3"] = True

        st.subheader("🔥 Top 3 Picks by Day")
        st.dataframe(
            df_sorted[df_sorted["Top3"]].drop(columns=["Top3"]),
            use_container_width=True,
            height=500
        )

# ----- Full Table Tab -----
with tabs[2]:
    if df.empty:
        st.info("No picks to show.")
    else:
        st.subheader("📋 All Picks (Filtered)")
        st.dataframe(df, use_container_width=True, height=600)

# ----- Styling Fix -----
st.markdown("""
<style>
    section.main > div {
        padding-top: 2rem;
    }
</style>
""", unsafe_allow_html=True)
