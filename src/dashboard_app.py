import pandas as pd
import streamlit as st
from pathlib import Path
st.set_page_config(page_title="Sports Edge ATS", layout="wide")
st.title("Sports Edge — ATS Backtests (Green / Yellow / Red)")

MAP = {"NBA":("data/nba/top_picks.json","data/nba/summary.json"),
       "MLB":("data/mlb/top_picks.json","data/mlb/summary.json"),
       "UFC":("data/ufc/top_picks.json","data/ufc/summary.json")}

def load_json(path):
    p = Path(path)
    if not p.exists() or p.stat().st_size==0: return pd.DataFrame()
    try: return pd.read_json(p)
    except: return pd.DataFrame()

tabs = st.tabs(list(MAP.keys()))
for lg, tab in zip(MAP.keys(), tabs):
    with tab:
        pk, sm = MAP[lg]
        st.subheader(f"{lg} Picks")
        df = load_json(pk)
        if df.empty:
            st.info(f"No picks yet (expected {pk}).")
        else:
            def style(row):
                ev = float(row.get("EV$",0) or 0)
                color = "#f8d7da"
                if ev>8: color = "#d4edda"
                elif ev>3: color = "#fff3cd"
                return [f"background-color:{color}"]*len(row)
            st.dataframe(df.style.apply(style, axis=1), use_container_width=True)

        st.subheader(f"{lg} Summary")
        sp = Path(sm)
        if not sp.exists():
            st.info(f"No summary yet (expected {sm}).")
        else:
            import json
            st.code(sp.read_text(), language="json")
