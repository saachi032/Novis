"""Decision logic aligned with on-chain rebalance intent (keeper / router).

`RebalanceExecutor.checkUpkeep` is currently a stub in Solidity. Live execution
uses `RiskRegistry.canRebalance` for the cooldown gate and `StrategyRouter` APYs
in basis points to pick the higher-yield venue. This module models the same
economics an off-chain keeper would apply before calling `rebalance`: material
APY spread (decimal APY, equivalent to bps/10_000 on-chain), cooldown elapsed,
and short-horizon projected yield versus a fixed gas budget.

`risk_level` scales baseline `apy_threshold` / `cooldown_days` from `StrategyConfig`
so low risk is less sensitive and high risk is more reactive. The simulation
engine separately enforces `rebalance_interval_days` between evaluations.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Optional

from pandas import Timestamp

from backtest.strategy.config import StrategyConfig


def normalized_risk_level(risk_level: str) -> str:
    x = (risk_level or "medium").strip().lower()
    if x not in ("low", "medium", "high"):
        return "medium"
    return x


@dataclass(frozen=True)
class SwitchDecision:
    """Result of one rebalance evaluation (single-step)."""

    target: str
    should_switch: bool
    projected_gain: float
    reason: str

    def as_tuple(self) -> tuple[bool, str]:
        return (self.should_switch, self.reason)


class ThresholdSwitcher:
    def __init__(self, config: StrategyConfig) -> None:
        self.config = config

    def effective_apy_threshold(self) -> float:
        r = normalized_risk_level(self.config.risk_level)
        base = float(self.config.apy_threshold)
        if r == "low":
            return base * 4.0
        if r == "high":
            return max(base * 0.35, 5e-5)
        return base

    def effective_cooldown_days(self) -> int:
        r = normalized_risk_level(self.config.risk_level)
        base = max(1, int(self.config.cooldown_days))
        if r == "low":
            return max(base, 7)
        if r == "high":
            return max(1, base // 2)
        return base

    def decide(
        self,
        current_protocol: str,
        current_apy: float,
        candidate_protocol: str,
        candidate_apy: float,
        capital: float,
        now: Timestamp,
        last_switch: Optional[Timestamp],
    ) -> SwitchDecision:
        if candidate_protocol == current_protocol:
            return SwitchDecision(candidate_protocol, False, 0.0, "same protocol")

        apy_floor = self.effective_apy_threshold()
        apy_diff = float(candidate_apy) - float(current_apy)
        if apy_diff <= apy_floor:
            return SwitchDecision(
                candidate_protocol,
                False,
                0.0,
                "APY difference below threshold",
            )

        window_days = max(1, self.config.time_window_days)
        projected_gain = apy_diff * capital * window_days / 365.0
        cd_days = self.effective_cooldown_days()
        cooldown_ok = last_switch is None or (now - last_switch) >= timedelta(days=cd_days)
        if not cooldown_ok:
            return SwitchDecision(
                candidate_protocol,
                False,
                projected_gain,
                "Cooldown not passed",
            )
        if projected_gain <= self.config.gas_cost_usd:
            return SwitchDecision(
                candidate_protocol,
                False,
                projected_gain,
                "Not profitable after gas",
            )
        return SwitchDecision(
            candidate_protocol,
            True,
            projected_gain,
            "Switched: projected gain > gas",
        )
