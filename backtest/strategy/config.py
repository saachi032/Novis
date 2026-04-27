"""Configuration for the threshold-based switching strategy."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class StrategyConfig:
    gas_cost_usd: float = 5.0
    apy_threshold: float = 0.001
    cooldown_days: int = 1
    time_window_days: int = 7
    initial_capital: float = 1_000.0
    risk_level: str = "medium"
    rebalance_interval_days: int = 1
