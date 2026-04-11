import pandas as pd

from backtest.strategy.config import StrategyConfig
from backtest.strategy.threshold import ThresholdSwitcher


def test_threshold_blocks_small_delta() -> None:
    config = StrategyConfig(apy_threshold=0.01)
    switcher = ThresholdSwitcher(config)
    decision = switcher.decide(
        current_protocol="aave",
        current_apy=0.01,
        candidate_protocol="morpho",
        candidate_apy=0.015,
        capital=1_000.0,
        now=pd.Timestamp("2025-01-10"),
        last_switch=None,
    )
    assert not decision.should_switch
    assert decision.reason == "below threshold"


def test_threshold_obeys_cooldown() -> None:
    config = StrategyConfig(apy_threshold=0.0, cooldown_days=3)
    switcher = ThresholdSwitcher(config)
    last_switch = pd.Timestamp("2025-01-10")
    now = pd.Timestamp("2025-01-11")
    decision = switcher.decide(
        current_protocol="aave",
        current_apy=0.01,
        candidate_protocol="morpho",
        candidate_apy=0.05,
        capital=1_000.0,
        now=now,
        last_switch=last_switch,
    )
    assert not decision.should_switch
    assert decision.reason == "cooldown"


def test_threshold_switches_when_profitable() -> None:
    config = StrategyConfig(apy_threshold=0.0, gas_cost_usd=1.0, time_window_days=30)
    switcher = ThresholdSwitcher(config)
    now = pd.Timestamp("2025-01-10")
    decision = switcher.decide(
        current_protocol="aave",
        current_apy=0.02,
        candidate_protocol="morpho",
        candidate_apy=0.08,
        capital=1_000.0,
        now=now,
        last_switch=None,
    )
    assert decision.should_switch
    assert decision.reason == "profitable"
