"""Matplotlib helpers for plotting backtest histories."""
from __future__ import annotations

from pathlib import Path
from typing import Iterable

import matplotlib.pyplot as plt
import pandas as pd

from backtest.simulation.engine import SimulationResult


def plot_growth(results: Iterable[SimulationResult], output_path: Path | None = None) -> None:
    plt.figure(figsize=(10, 6))
    for result in results:
        if result.history.empty:
            continue
        series = result.history["capital"]
        label = f"{result.label} (${result.final_capital:,.0f})"
        plt.plot(series.index, series.values, label=label)
        if result.label == "dynamic" and "switched" in result.history.columns:
            switched = result.history["switched"]
            if switched.any():
                ts = result.history.index[switched]
                vals = result.history.loc[switched, "capital"]
                plt.scatter(ts, vals, color="#059669", s=22, zorder=3, label="rebalance (gas paid)")

    plt.legend()
    plt.xlabel("Date")
    plt.ylabel("Capital (USD)")
    plt.title("Strategy capital growth")
    plt.grid(alpha=0.3)
    plt.tight_layout()
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(output_path)
    plt.close()
