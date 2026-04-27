from backtest.data.manifest import filter_usdc_aave_compound

# Same canonical USDC as on Ethereum mainnet — used so Morpho vault rows match Aave by underlying.
_ETH_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"


def _make_entry(
    project: str,
    pool: str,
    tvl: float,
    symbol: str = "USDC",
    chain: str = "Ethereum",
    underlying_tokens: list[str] | None = None,
) -> dict:
    row: dict = {
        "project": project,
        "symbol": symbol,
        "pool": pool,
        "tvlUsd": tvl,
        "chain": chain,
    }
    if underlying_tokens:
        row["underlyingTokens"] = underlying_tokens
    return row


def test_filter_usdc_aave_compound_pick_best() -> None:
    manifest = [
        _make_entry("aave-v3", "aave-low", 10_000.0, underlying_tokens=[_ETH_USDC]),
        _make_entry("aave-v3", "aave-high", 50_000.0, underlying_tokens=[_ETH_USDC]),
        _make_entry("compound-v3", "compound-low", 5_000.0, underlying_tokens=[_ETH_USDC]),
        _make_entry("compound-v3", "compound-high", 20_000.0, underlying_tokens=[_ETH_USDC]),
        _make_entry("morpho-v1", "morpho-low", 8_000.0, underlying_tokens=[_ETH_USDC]),
        _make_entry("morpho-v1", "morpho-high", 30_000.0, underlying_tokens=[_ETH_USDC]),
        # Vault-style symbol but same USDC underlying — should beat plain USDC if higher TVL.
        _make_entry(
            "morpho-v1",
            "morpho-vault",
            100_000.0,
            symbol="GTUSDCP",
            underlying_tokens=[_ETH_USDC],
        ),
    ]
    descriptors = filter_usdc_aave_compound(manifest)
    assert len(descriptors) == 3
    assert any(desc.pool_id == "aave-high" for desc in descriptors)
    assert any(desc.pool_id == "compound-high" for desc in descriptors)
    assert any(desc.pool_id == "morpho-vault" for desc in descriptors)
