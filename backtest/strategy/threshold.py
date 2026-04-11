"""Decision logic for when to switch protocols."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from pandas import Timestamp

from backtest.strategy.config import StrategyConfig


@dataclass(frozen=True)
class SwitchDecision:
    target: str
    should_switch: bool
    projected_gain: float
    reason: str


class ThresholdSwitcher:
    def __init__(self, config: StrategyConfig) -> None:
        self.config = config

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

        apy_delta = candidate_apy - current_apy
        if apy_delta <= self.config.apy_threshold:
            return SwitchDecision(candidate_protocol, False, 0.0, "below threshold")

        window_days = max(1, self.config.time_window_days)
        projected_gain = apy_delta * capital * window_days / 365.0
        cost = self.config.gas_cost_usd
        cooldown_ok = (
            last_switch is None
            or (now - last_switch) >= timedelta(days=self.config.cooldown_days)
        )
        if not cooldown_ok:
            return SwitchDecision(candidate_protocol, False, projected_gain, "cooldown")
        if projected_gain <= cost:
            return SwitchDecision(candidate_protocol, False, projected_gain, "gas cost")
        return SwitchDecision(candidate_protocol, True, projected_gain, "profitable")
