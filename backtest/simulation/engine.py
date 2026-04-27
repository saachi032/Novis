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
            span = max(
                self.switcher.effective_cooldown_days(),
                max(1, int(self.config.rebalance_interval_days)),
            )
            last_switch = series.index[0] - timedelta(days=span)

        snapshots: list[PortfolioSnapshot] = []
        row_extras: list[tuple[bool, str]] = []
        morpho_apy_path: list[float] = []
        switch_count = 0
        for timestamp, row in series.iterrows():
            switched = False
            switch_reason = ""
            if allow_switch:
                interval_ok = last_switch is None or (
                    (timestamp - last_switch)
                    >= timedelta(days=max(1, int(self.config.rebalance_interval_days)))
                )
                if not interval_ok:
                    switch_reason = "Rebalance interval not elapsed"
                else:
                    apy_by_protocol = {
                        p: float(row.get(f"{p}_apy", 0.0)) for p in self.protocols
                    }
                    best_protocol = max(self.protocols, key=lambda p: apy_by_protocol[p])
                    if best_protocol == current_protocol:
                        switch_reason = "Already on highest APY"
                    else:
                        decision = self.switcher.decide(
                            current_protocol=current_protocol,
                            current_apy=apy_by_protocol[current_protocol],
                            candidate_protocol=best_protocol,
                            candidate_apy=apy_by_protocol[best_protocol],
                            capital=capital,
                            now=timestamp,
                            last_switch=last_switch,
                        )
                        switch_reason = decision.reason
                        if decision.should_switch:
                            switched = True
                            capital -= self.config.gas_cost_usd
                            current_protocol = decision.target
                            last_switch = timestamp
                            switch_count += 1
            else:
                switch_reason = ""
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
            row_extras.append((switched, switch_reason))
            morpho_apy_path.append(float(row.get("morpho_apy", 0.0)))
        risk = str(self.config.risk_level)
        interval_days = int(self.config.rebalance_interval_days)
        history = pd.DataFrame(
            [
                {
                    "timestamp": snap.timestamp,
                    "capital": snap.capital,
                    "protocol": snap.current_protocol,
                    "switches": snap.switches,
                    "switched": switched,
                    "switch_reason": switch_reason,
                    "risk_level": risk,
                    "rebalance_interval_days": interval_days,
                    "morpho_apy": m_apy,
                }
                for snap, (switched, switch_reason), m_apy in zip(
                    snapshots, row_extras, morpho_apy_path
                )
            ]
        )
        history = history.set_index("timestamp")
        final_capital = capital
        profit_usd = final_capital - self.config.initial_capital
        profit_pct = (profit_usd / self.config.initial_capital) * 100.0
        return SimulationResult(label, final_capital, profit_usd, profit_pct, switch_count, history)

    def run_dynamic(self, series: pd.DataFrame, initial_protocol: str) -> SimulationResult:
        return self._simulate("dynamic", series, initial_protocol, allow_switch=True)

    def run_static(self, series: pd.DataFrame, protocol: str) -> SimulationResult:
        return self._simulate(f"static-{protocol}", series, protocol, allow_switch=False)
