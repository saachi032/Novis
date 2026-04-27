"""Entry point for the DeFi yield optimizer backtest."""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Sequence

from backtest.data.align import align_charts
from backtest.data.chart_client import ChartClient
from backtest.data.manifest import load_manifest, filter_usdc_aave_compound
from backtest.reports.output import export_history, summarize
from backtest.simulation.engine import SimulationEngine
from backtest.strategy.config import StrategyConfig
from backtest.strategy.threshold import ThresholdSwitcher
from backtest.visualization.plots import plot_growth


def normalize_protocol(protocol: str) -> str:
    lowered = protocol.lower()
    if "aave" in lowered:
        return "aave"
    if "compound" in lowered:
        return "compound"
    if "morpho" in lowered:
        return "morpho"
    return lowered


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Run the DeFi yield optimizer backtest.")
    parser.add_argument("--manifest", default="defiyeildpool.json", help="Path to the DefiLlama manifest JSON.")
    parser.add_argument("--cache-dir", default="cache", help="Directory to cache DefiLlama chart responses.")
    parser.add_argument("--refresh-cache", action="store_true", help="Force a fresh fetch from DefiLlama.")
    parser.add_argument("--dry-run", action="store_true", help="Skip HTTP calls and rely on cached charts.")
    parser.add_argument("--initial-capital", type=float, default=1_000.0)
    parser.add_argument("--gas-cost", type=float, default=5.0)
    parser.add_argument("--apy-threshold", type=float, default=0.001)
    parser.add_argument("--cooldown-days", type=int, default=1)
    parser.add_argument("--time-window-days", type=int, default=7)
    parser.add_argument("--risk-level", default="medium", choices=("low", "medium", "high"))
    parser.add_argument("--rebalance-interval-days", type=int, default=1)
    parser.add_argument("--plot-path", default="plots/capital_growth.png")
    parser.add_argument("--history-dir", default="histories")
    args = parser.parse_args(argv)

    manifest_data = load_manifest(Path(args.manifest))
    descriptors = filter_usdc_aave_compound(manifest_data)
    if len(descriptors) < 3:
        raise SystemExit("failed to locate Aave, Compound, and Morpho USDC pools in the manifest")

    chart_client = ChartClient(Path(args.cache_dir))
    charts: dict[str, list[dict[str, float]]] = {}
    for descriptor in descriptors:
        key = normalize_protocol(descriptor.protocol)
        if key in charts:
            continue
        if args.dry_run:
            charts[key] = chart_client.load_cached(descriptor.pool_id)
        else:
            charts[key] = chart_client.fetch(descriptor.pool_id, force_refresh=args.refresh_cache)

    aligned = align_charts(charts, lookback_days=365)

    config = StrategyConfig(
        gas_cost_usd=args.gas_cost,
        apy_threshold=args.apy_threshold,
        cooldown_days=args.cooldown_days,
        time_window_days=args.time_window_days,
        initial_capital=args.initial_capital,
        risk_level=args.risk_level,
        rebalance_interval_days=max(1, args.rebalance_interval_days),
    )
    switcher = ThresholdSwitcher(config)
    engine = SimulationEngine(config, switcher, protocols=["aave", "compound", "morpho"])

    dynamic = engine.run_dynamic(aligned, initial_protocol="aave")
    static_aave = engine.run_static(aligned, "aave")
    static_compound = engine.run_static(aligned, "compound")
    static_morpho = engine.run_static(aligned, "morpho")

    results = [dynamic, static_aave, static_compound, static_morpho]
    summarize(results)
    plot_growth(results, Path(args.plot_path))
    for result in results:
        export_history(result, Path(args.history_dir) / f"{result.label}.csv")


if __name__ == "__main__":
    main()
