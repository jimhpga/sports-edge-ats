# api/main.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json

app = FastAPI(title="SportsEdge API", version="1.0.0")

# Allow your Vercel site to fetch
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your domains once live
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path("outputs")  # or wherever you write JSON results

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/api/edge-data")
def edge_data(sport: str = Query("nfl", pattern="^(nfl|nba|mlb|ufc)$")):
    # Example JSON filenames: outputs/nfl/today.json
    p = DATA_DIR / sport / "today.json"
    if not p.exists():
        return {"sport": sport, "items": [], "note": "No data yet"}
    return json.loads(p.read_text())
