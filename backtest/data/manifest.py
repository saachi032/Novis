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
    return PoolDescriptor(
        pool_id=winner["pool"],
        protocol=protocol_label,
        symbol=symbol,
        chain=winner.get("chain", ""),
    )


def filter_usdc_aave_compound(
    manifest: Iterable[dict],
    symbol: str = "USDC",
) -> List[PoolDescriptor]:
    """Pick highest-TVL USDC pools for Aave v3 and Compound (v3 / v2 naming on DefiLlama)."""
    aave = _best_pool_for_prefixes(manifest, symbol, "aave-v3", ("aave-v3",))
    compound = _best_pool_for_prefixes(
        manifest,
        symbol,
        "compound-v3",
        ("compound-v3", "compound-v2", "compound"),
    )
    out: list[PoolDescriptor] = []
    if aave:
        out.append(aave)
    if compound:
        out.append(compound)
    return out
