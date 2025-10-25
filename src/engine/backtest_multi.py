import pandas as pd
import numpy as np

def american_odds_to_implied_prob(odds):
    """
    Convert American odds to implied probability.
    For positive odds: prob = 100/(odds+100); for negative odds: prob = -odds/(-odds+100).
    """
    if odds >= 0:
        return 100.0 / (odds + 100.0)
    else:
        return -odds / (-odds + 100.0)

def american_odds_to_decimal(odds):
    """
    Convert American odds to decimal odds.
    Decimal odds = (positive odds/100)+1 for positive odds, or (100/|negative odds|)+1 for negative odds.
    """
    if odds >= 0:
        return (odds / 100.0) + 1.0
    else:
        return (100.0 / (-odds)) + 1.0

def backtest(df):
    """
    Backtest betting strategy on multi-sport data (NFL, NBA, MLB).
    Detects missing columns (week, spread, spread_odds) and adapts logic for each sport.
    Computes implied probabilities, EV, results, profit, and tiers.
    Saves results to CSV and summary to HTML.
    """
    has_spread = 'home_spread_odds' in df.columns and 'away_spread_odds' in df.columns
    has_moneyline = 'home_moneyline_odds' in df.columns and 'away_moneyline_odds' in df.columns
    if has_spread:
        if any(col in df.columns for col in ['net_rating', 'home_net_rating', 'away_net_rating', 'rest_days']):
            sport = 'NBA'
        else:
            sport = 'NFL'
    elif has_moneyline:
        sport = 'MLB'
    else:
        sport = 'NFL' if 'week' in df.columns else 'MLB'
    print(f"Detected sport: {sport}")

    df['week'] = df.get('week', np.nan)
    if has_spread and 'spread' not in df.columns:
        df['spread'] = df.get('close_spread', np.nan)
    if has_spread and 'home_spread_odds' in df.columns:
        df['spread_odds_home'] = df['home_spread_odds']
        df['spread_odds_away'] = df['away_spread_odds']
    if has_moneyline and 'home_moneyline_odds' in df.columns:
        df['moneyline_odds_home'] = df['home_moneyline_odds']
        df['moneyline_odds_away'] = df['away_moneyline_odds']

    if sport in ['NFL', 'NBA']:
        if 'home_net_rating' in df.columns and 'away_net_rating' in df.columns:
            df['net_rating_diff'] = df['home_net_rating'] - df['away_net_rating']
        if 'home_rest_days' in df.columns and 'away_rest_days' in df.columns:
            df['rest_diff'] = df['home_rest_days'] - df['away_rest_days']

        df['prob_home_cover'] = df['home_spread_odds'].apply(american_odds_to_implied_prob)
        df['prob_away_cover'] = df['away_spread_odds'].apply(american_odds_to_implied_prob)
        df['decimal_odds_home_spread'] = df['home_spread_odds'].apply(american_odds_to_decimal)
        df['decimal_odds_away_spread'] = df['away_spread_odds'].apply(american_odds_to_decimal)

        df['bet_side'] = 'home'
        if 'home_score' in df.columns and 'away_score' in df.columns:
            df['spread_diff'] = (df['home_score'] - df['away_score']) + df['spread']
            df['won'] = df['spread_diff'] > 0
        else:
            df['won'] = False

        df['p_model'] = df.get('model_prob', 0.5)
        df['EV'] = df['p_model'] * df['decimal_odds_home_spread'] - (1 - df['p_model']) * 1
        df['profit'] = np.where(df['won'], df['decimal_odds_home_spread'] - 1, -1)

    elif sport == 'MLB':
        if 'home_xFIP' in df.columns and 'away_xFIP' in df.columns:
            df['xFIP_diff'] = df['home_xFIP'] - df['away_xFIP']
        if 'home_bullpen_fatigue' in df.columns and 'away_bullpen_fatigue' in df.columns:
            df['bullpen_diff'] = df['home_bullpen_fatigue'] - df['away_bullpen_fatigue']
        if 'ballpark_factor' in df.columns:
            df['ballpark_effect'] = df['ballpark_factor']

        df['prob_home_win'] = df['home_moneyline_odds'].apply(american_odds_to_implied_prob)
        df['prob_away_win'] = df['away_moneyline_odds'].apply(american_odds_to_implied_prob)
        df['decimal_odds_home_ml'] = df['home_moneyline_odds'].apply(american_odds_to_decimal)
        df['decimal_odds_away_ml'] = df['away_moneyline_odds'].apply(american_odds_to_decimal)

        df['bet_side'] = 'home'
        if 'home_score' in df.columns and 'away_score' in df.columns:
            df['won'] = df['home_score'] > df['away_score']
        else:
            df['won'] = False

        df['p_model'] = df.get('model_prob', 0.5)
        df['EV'] = df['p_model'] * df['decimal_odds_home_ml'] - (1 - df['p_model']) * 1
        df['profit'] = np.where(df['won'], df['decimal_odds_home_ml'] - 1, -1)

    else:
        raise ValueError("Sport not recognized or insufficient data")

    df['tier'] = pd.qcut(df['EV'], q=4, labels=['Tier4','Tier3','Tier2','Tier1'])

    df.to_csv('backtest_results.csv', index=False)
    summary_html = df.describe().to_html()
    with open('summary.html', 'w') as f:
        f.write(summary_html)

    return df