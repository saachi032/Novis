"""Backtesting engine that applies strategy decisions on aligned APY series."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Iterable

import pandas as pd

from backtest.strategy.config import StrategyConfig
from backtest.strategy.threshold import ThresholdSwitcher


@dataclass
class PortfolioSnapshot:
    timestamp: pd.Timestamp
    capital: float
    current_protocol: str
    switches: int


@dataclass
class SimulationResult:
    label: str
    final_capital: float
    profit_usd: float
    profit_pct: float
    switches: int
    history: pd.DataFrame


class SimulationEngine:
    def __init__(self, config: StrategyConfig, switcher: ThresholdSwitcher, protocols: Iterable[str]):
        self.config = config
        self.switcher = switcher
        self.protocols = list(protocols)

    def _daily_growth(self, apy: float) -> float:
        return 1.0 + apy / 365.0

    def _simulate(
        self,
        label: str,
        series: pd.DataFrame,
        initial_protocol: str,
        allow_switch: bool,
    ) -> SimulationResult:
        capital = self.config.initial_capital
        current_protocol = initial_protocol
        last_switch: pd.Timestamp | None = None
        if not series.index.empty:
            last_switch = series.index[0] - timedelta(days=self.config.cooldown_days)

        snapshots: list[PortfolioSnapshot] = []
        switch_count = 0
        for timestamp, row in series.iterrows():
            if allow_switch:
                candidate_protocol = self._candidate(current_protocol)
                decision = self.switcher.decide(
                    current_protocol=current_protocol,
                    current_apy=row.get(f"{current_protocol}_apy", 0.0),
                    candidate_protocol=candidate_protocol,
                    candidate_apy=row.get(f"{candidate_protocol}_apy", 0.0),
                    capital=capital,
                    now=timestamp,
                    last_switch=last_switch,
                )
                if decision.should_switch:
                    capital -= self.config.gas_cost_usd
                    current_protocol = decision.target
                    last_switch = timestamp
                    switch_count += 1
            apy_today = row.get(f"{current_protocol}_apy", 0.0)
            capital *= self._daily_growth(apy_today)
            snapshots.append(
                PortfolioSnapshot(
                    timestamp=timestamp,
                    capital=capital,
                    current_protocol=current_protocol,
                    switches=switch_count,
                )
            )
        history = pd.DataFrame([
            {
                "timestamp": snap.timestamp,
                "capital": snap.capital,
                "protocol": snap.current_protocol,
                "switches": snap.switches,
            }
            for snap in snapshots
        ])
        history = history.set_index("timestamp")
        final_capital = capital
        profit_usd = final_capital - self.config.initial_capital
        profit_pct = (profit_usd / self.config.initial_capital) * 100.0
        return SimulationResult(label, final_capital, profit_usd, profit_pct, switch_count, history)

    def _candidate(self, current: str) -> str:
        others = [protocol for protocol in self.protocols if protocol != current]
        if not others:
            return current
        return others[0]

    def run_dynamic(self, series: pd.DataFrame, initial_protocol: str) -> SimulationResult:
        return self._simulate("dynamic", series, initial_protocol, allow_switch=True)

    def run_static(self, series: pd.DataFrame, protocol: str) -> SimulationResult:
        return self._simulate(f"static-{protocol}", series, protocol, allow_switch=False)
