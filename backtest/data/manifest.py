"""Helpers for filtering and describing pools from the DefiLlama manifest."""
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


def filter_usdc_protocols(
    manifest: Iterable[dict],
    protocols: Iterable[str] = ("aave-v3", "morpho-v1"),
    symbol: str = "USDC",
) -> List[PoolDescriptor]:
    symbol = symbol.upper()
    wanted = {protocol.lower(): protocol for protocol in protocols}
    pools_per_protocol: dict[str, list[dict]] = {protocol: [] for protocol in wanted.values()}

    for entry in manifest:
        project = (entry.get("project") or "").lower()
        entry_symbol = (entry.get("symbol") or "").upper()
        if entry_symbol != symbol:
            continue
        for key, original in wanted.items():
            if project.startswith(key):
                pools_per_protocol[original].append(entry)
                break

    descriptors: list[PoolDescriptor] = []
    for protocol, entries in pools_per_protocol.items():
        if not entries:
            continue
        winner = max(entries, key=lambda item: item.get("tvlUsd") or 0)
        descriptors.append(
            PoolDescriptor(
                pool_id=winner["pool"],
                protocol=protocol,
                symbol=symbol,
                chain=winner.get("chain", ""),
            )
        )

    return descriptors
