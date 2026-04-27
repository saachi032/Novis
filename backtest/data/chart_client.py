"""Lightweight client for DefiLlama chart endpoints with local caching."""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Sequence

import requests


DEFAULT_BASE = "https://yields.llama.fi/chart"


class ChartClient:
    def __init__(self, cache_dir: Path, base_url: str = DEFAULT_BASE) -> None:
        self.cache_dir = cache_dir
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _cache_path(self, pool_id: str) -> Path:
        return self.cache_dir / f"{pool_id}.json"

    def fetch(self, pool_id: str, force_refresh: bool = False) -> Sequence[Any]:
        cache_file = self._cache_path(pool_id)
        if cache_file.exists() and not force_refresh:
            return json.loads(cache_file.read_text(encoding="utf-8"))

        response = self._request_with_backoff(pool_id)
        cache_file.write_text(json.dumps(response), encoding="utf-8")
        return response

    def load_cached(self, pool_id: str) -> Sequence[Any]:
        cache_file = self._cache_path(pool_id)
        if not cache_file.exists():
            raise FileNotFoundError(cache_file)
        return json.loads(cache_file.read_text(encoding="utf-8"))

    def _request_with_backoff(self, pool_id: str, retries: int = 3) -> Sequence[Any]:
        url = f"{self.base_url}/{pool_id}"
        for attempt in range(1, retries + 1):
            response = self.session.get(url, timeout=20)
            if response.ok:
                return response.json().get("data", [])
            wait = 2 ** attempt
            time.sleep(wait)
        response.raise_for_status()
