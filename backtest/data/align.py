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
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    df = df.set_index("timestamp").sort_index()
    if "apy" not in df.columns:
        raise ValueError("chart response missing 'apy' field")
    series = df["apy"].astype(float) / 100.0
    series = series.resample("1D").last().ffill()
    return series


def align_charts(
    charts: Mapping[str, Sequence[Mapping[str, float]]],
    lookback_days: int = 365,
) -> pd.DataFrame:
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
