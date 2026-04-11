from backtest.data.manifest import filter_usdc_protocols


def _make_entry(project: str, pool: str, tvl: float, symbol: str = "USDC") -> dict:
    return {"project": project, "symbol": symbol, "pool": pool, "tvlUsd": tvl, "chain": "Ethereum"}


def test_filter_usdc_protocols_pick_best() -> None:
    manifest = [
        _make_entry("aave-v3", "aave-low", 10_000.0),
        _make_entry("aave-v3", "aave-high", 50_000.0),
        _make_entry("morpho-v1", "morpho-low", 5_000.0),
        _make_entry("morpho-v1", "morpho-high", 20_000.0),
    ]
    descriptors = filter_usdc_protocols(manifest)
    assert len(descriptors) == 2
    assert any(desc.pool_id == "aave-high" for desc in descriptors)
    assert any(desc.pool_id == "morpho-high" for desc in descriptors)
