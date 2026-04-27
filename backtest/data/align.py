"""Utilities to normalize DefiLlama chart responses into aligned daily series."""
from __future__ import annotations

from datetime import timedelta
from typing import Mapping, Sequence

import pandas as pd


def _chart_to_series(chart: Sequence[Mapping[str, float]]) -> pd.Series:
    df = pd.DataFrame(chart)
    if df.empty:
        return pd.Series(dtype=float)
    df = df.dropna(subset=["timestamp"])
    # DefiLlama yields charts use ms timestamps; some series may use seconds.
    ts = df["timestamp"].astype(float)
    df["timestamp"] = pd.to_datetime(ts.where(ts > 1e12, ts * 1000), unit="ms")
    df = df.set_index("timestamp").sort_index()
    if "apy" in df.columns and "apyBase" in df.columns:
        apy_col = df["apy"].astype(float).fillna(df["apyBase"].astype(float))
    elif "apy" in df.columns:
        apy_col = df["apy"].astype(float)
    elif "apyBase" in df.columns:
        apy_col = df["apyBase"].astype(float)
    else:
        raise ValueError("chart response missing 'apy' / 'apyBase' field")
    series = apy_col / 100.0
    series = series.resample("1D").last().ffill()
    return series


def align_charts(
    charts: Mapping[str, Sequence[Mapping[str, float]]],
    lookback_days: int = 365,
) -> pd.DataFrame:
    """Merge one or more protocol chart payloads (e.g. aave, compound, morpho) on a daily index."""
    series = {name: _chart_to_series(chart) for name, chart in charts.items()}
    combined = pd.DataFrame(series)
    if combined.empty:
        raise ValueError("no data available after aligning charts")
    end = combined.index.max()
    start = end - timedelta(days=lookback_days)
    windowed = combined.loc[start:end].copy()
    windowed = windowed.rename(columns=lambda name: f"{name.lower()}_apy")
    windowed = windowed.ffill().bfill(limit=7)
    windowed = windowed.dropna(how="any")
    return windowed
