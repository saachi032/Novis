"""Helpers for filtering and describing pools from the DefiLlama manifest."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List
import json


@dataclass(frozen=True)
class PoolDescriptor:
    pool_id: str
    protocol: str
    symbol: str
    chain: str
    underlying_tokens: tuple[str, ...] = ()


def load_manifest(path: Path) -> List[dict]:
    with path.open(encoding="utf-8") as manifest_file:
        payload = json.load(manifest_file)
    return payload.get("data", [])


def _best_pool_for_prefixes(
    manifest: Iterable[dict],
    symbol: str,
    protocol_label: str,
    project_prefixes: tuple[str, ...],
) -> PoolDescriptor | None:
    symbol = symbol.upper()
    candidates: list[dict] = []
    for entry in manifest:
        entry_symbol = (entry.get("symbol") or "").upper()
        if entry_symbol != symbol:
            continue
        project = (entry.get("project") or "").lower()
        if any(project.startswith(prefix) for prefix in project_prefixes):
            candidates.append(entry)
    if not candidates:
        return None
    winner = max(candidates, key=lambda item: item.get("tvlUsd") or 0)
    unders = tuple(
        str(t).lower() for t in (winner.get("underlyingTokens") or []) if t
    )
    return PoolDescriptor(
        pool_id=winner["pool"],
        protocol=protocol_label,
        symbol=symbol,
        chain=winner.get("chain", ""),
        underlying_tokens=unders,
    )


def _descriptor_from_entry(entry: dict, protocol_label: str, symbol: str) -> PoolDescriptor:
    unders = tuple(
        str(t).lower() for t in (entry.get("underlyingTokens") or []) if t
    )
    return PoolDescriptor(
        pool_id=entry["pool"],
        protocol=protocol_label,
        symbol=symbol.upper(),
        chain=entry.get("chain", ""),
        underlying_tokens=unders,
    )


def _best_morpho_for_reference(
    manifest: Iterable[dict],
    reference: PoolDescriptor,
    symbol: str = "USDC",
) -> PoolDescriptor | None:
    """Highest-TVL Morpho pool on the same chain as `reference`, matching USDC.

    DefiLlama lists MetaMorpho vaults as symbols like GTUSDCP, not USDC; we accept any pool whose
    underlying token set overlaps the reference pool (same USDC address on that chain).
    """
    symbol_u = symbol.upper()
    ref_chain = reference.chain
    ref_under = set(reference.underlying_tokens)
    candidates: list[dict] = []
    for entry in manifest:
        if (entry.get("chain") or "") != ref_chain:
            continue
        project = (entry.get("project") or "").lower()
        if not project.startswith("morpho"):
            continue
        entry_symbol = (entry.get("symbol") or "").upper()
        entry_under = {str(t).lower() for t in (entry.get("underlyingTokens") or []) if t}
        matches_symbol = entry_symbol == symbol_u
        matches_asset = bool(ref_under and entry_under & ref_under)
        if not (matches_symbol or matches_asset):
            continue
        candidates.append(entry)
    if not candidates:
        return None
    winner = max(candidates, key=lambda item: item.get("tvlUsd") or 0)
    return _descriptor_from_entry(winner, "morpho", winner.get("symbol") or symbol_u)


def filter_usdc_aave_compound(
    manifest: Iterable[dict],
    symbol: str = "USDC",
) -> List[PoolDescriptor]:
    """Pick highest-TVL USDC pools for Aave v3, Compound (v3 / v2), and Morpho (morpho / morpho-v1, etc.)."""
    aave = _best_pool_for_prefixes(manifest, symbol, "aave-v3", ("aave-v3",))
    compound = _best_pool_for_prefixes(
        manifest,
        symbol,
        "compound-v3",
        ("compound-v3", "compound-v2", "compound"),
    )
    morpho = _best_morpho_for_reference(manifest, aave, symbol) if aave else None
    out: list[PoolDescriptor] = []
    if aave:
        out.append(aave)
    if compound:
        out.append(compound)
    if morpho:
        out.append(morpho)
    return out
