"""Console reporting utilities for backtest summaries."""
from __future__ import annotations

from pathlib import Path
from typing import Iterable

import pandas as pd

from backtest.simulation.engine import SimulationResult


def summarize(results: Iterable[SimulationResult]) -> pd.DataFrame:
    records = []
    for result in results:
        records.append(
            {
                "strategy": result.label,
                "final_capital": result.final_capital,
                "profit_usd": result.profit_usd,
                "profit_pct": result.profit_pct,
                "switches": result.switches,
            }
        )
    summary = pd.DataFrame(records)
    summary["final_capital"] = summary["final_capital"].map("${:,.2f}".format)
    summary["profit_usd"] = summary["profit_usd"].map("${:,.2f}".format)
    summary["profit_pct"] = summary["profit_pct"].map("{:,.2f}%".format)
    print(summary.to_string(index=False))
    return summary


def export_history(result: SimulationResult, destination: Path) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    result.history.to_csv(destination)
    return destination
