import pandas as pd

from backtest.simulation.engine import SimulationEngine
from backtest.strategy.config import StrategyConfig
from backtest.strategy.threshold import ThresholdSwitcher


def _make_series(days: int = 10) -> pd.DataFrame:
    index = pd.date_range("2025-01-01", periods=days, freq="D")
    return pd.DataFrame(
        {
            "aave_apy": [0.05] * days,
            "compound_apy": [0.03] * days,
            "morpho_apy": [0.04] * days,
        },
        index=index,
    )


def test_static_aave_matches_compound_growth() -> None:
    config = StrategyConfig(initial_capital=1_000.0)
    switcher = ThresholdSwitcher(config)
    engine = SimulationEngine(config, switcher, protocols=["aave", "compound"])
    series = _make_series(10)
    result = engine.run_static(series, "aave")
    expected = 1_000.0 * (1 + 0.05 / 365.0) ** 10
    assert abs(result.final_capital - expected) < 1e-6


def test_dynamic_respects_high_gas_cost() -> None:
    config = StrategyConfig(initial_capital=1_000.0, gas_cost_usd=1_000.0)
    switcher = ThresholdSwitcher(config)
    engine = SimulationEngine(config, switcher, protocols=["aave", "compound"])
    series = _make_series(5)
    result = engine.run_dynamic(series, "aave")
    assert result.switches == 0


def test_history_records_switch_flags() -> None:
    config = StrategyConfig(apy_threshold=0.0, gas_cost_usd=0.01, time_window_days=30)
    switcher = ThresholdSwitcher(config)
    engine = SimulationEngine(config, switcher, protocols=["aave", "compound"])
    series = _make_series(20)
    result = engine.run_dynamic(series, "aave")
    assert "switched" in result.history.columns
    assert "switch_reason" in result.history.columns
    assert "risk_level" in result.history.columns
    assert "rebalance_interval_days" in result.history.columns
    assert "morpho_apy" in result.history.columns
    assert int(result.history["switched"].sum()) == result.switches


def test_rebalance_interval_skips_evaluation() -> None:
    index = pd.date_range("2025-01-01", periods=5, freq="D")
    series = pd.DataFrame(
        {
            "aave_apy": [0.02, 0.02, 0.02, 0.02, 0.02],
            "compound_apy": [0.12, 0.12, 0.12, 0.12, 0.12],
            "morpho_apy": [0.06, 0.06, 0.06, 0.06, 0.06],
        },
        index=index,
    )
    config = StrategyConfig(
        apy_threshold=0.0,
        gas_cost_usd=0.01,
        time_window_days=30,
        risk_level="high",
        rebalance_interval_days=3,
    )
    switcher = ThresholdSwitcher(config)
    engine = SimulationEngine(config, switcher, protocols=["aave", "compound"])
    result = engine.run_dynamic(series, "aave")
    assert result.history.iloc[1]["switch_reason"] == "Rebalance interval not elapsed"
