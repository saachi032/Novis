import pandas as pd

from backtest.simulation.engine import SimulationEngine
from backtest.strategy.config import StrategyConfig
from backtest.strategy.threshold import ThresholdSwitcher


def _make_series(days: int = 10) -> pd.DataFrame:
    index = pd.date_range("2025-01-01", periods=days, freq="D")
    return pd.DataFrame({"aave_apy": [0.05] * days, "morpho_apy": [0.03] * days}, index=index)


def test_static_aave_matches_compound_growth() -> None:
    config = StrategyConfig(initial_capital=1_000.0)
    switcher = ThresholdSwitcher(config)
    engine = SimulationEngine(config, switcher, protocols=["aave", "morpho"])
    series = _make_series(10)
    result = engine.run_static(series, "aave")
    expected = 1_000.0 * (1 + 0.05 / 365.0) ** 10
    assert abs(result.final_capital - expected) < 1e-6


def test_dynamic_respects_high_gas_cost() -> None:
    config = StrategyConfig(initial_capital=1_000.0, gas_cost_usd=1_000.0)
    switcher = ThresholdSwitcher(config)
    engine = SimulationEngine(config, switcher, protocols=["aave", "morpho"])
    series = _make_series(5)
    result = engine.run_dynamic(series, "aave")
    assert result.switches == 0
