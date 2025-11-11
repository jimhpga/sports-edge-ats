# api/main.py
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal
from pathlib import Path
import json

app = FastAPI(title="SportsEdge API", version="1.0.0")

# Allow your site(s); keep * while wiring up, then restrict.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # later: ["https://edge.virtualcoachai.net", "https://sportsedge.virtualcoachai.net"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Absolute data dir: .../<repo-root>/outputs
DATA_DIR = (Path(__file__).resolve().parent.parent / "outputs").resolve()

Sport = Literal["nfl", "nba", "mlb", "ufc"]


@app.get("/health")
def health():
    return {"ok": True, "data_dir": str(DATA_DIR)}


def _load_json(path: Path) -> dict:
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {path.name}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bad JSON in {path.name}: {e}") from e


@app.get("/api/edge-data")
def edge_data_today(sport: Sport = "nfl"):
    """
    GET /api/edge-data?sport=nfl
    Reads: outputs/<sport>/today.json
    """
    p = DATA_DIR / sport / "today.json"
    return _load_json(p)


@app.get("/api/edge-data/{sport}/{date}")
def edge_data_by_date(sport: Sport, date: str):
    """
    GET /api/edge-data/nfl/2025-11-10
    Reads: outputs/<sport>/<date>.json  (YYYY-MM-DD)
    """
    p = DATA_DIR / sport / f"{date}.json"
    return _load_json(p)


@app.get("/api/edge-season/{sport}/{season}")
def edge_season(sport: Sport, season: str):
    """
    GET /api/edge-season/nfl/2025
    Reads: outputs/<sport>/season-<season>.json
    """
    p = DATA_DIR / sport / f"season-{season}.json"
    return _load_json(p)
