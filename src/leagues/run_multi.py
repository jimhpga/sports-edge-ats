from engine.backtest_multi import backtest
import pandas as pd

df = pd.read_csv("inputs/mlb_ats.csv")  # or nba_ats.csv, nfl_ats.csv
results = backtest(df)
print(results[["date", "home", "away", "EV", "profit", "tier"]].head(10))
