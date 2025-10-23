from engine.backtest_engine import backtest_ats
def test_demo():
    st, n, p, s = backtest_ats("TEST","inputs/missing.csv","data/test")
    assert st in ("DEMO","OK")
