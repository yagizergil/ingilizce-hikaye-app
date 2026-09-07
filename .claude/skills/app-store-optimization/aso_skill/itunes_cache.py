"""File-based TTL cache for iTunes Search API responses.

Wraps ``urllib.request.urlopen`` and stores decoded JSON bodies under
``$XDG_CACHE_HOME/aso-skill/itunes/`` (falling back to ``~/.cache/aso-skill/itunes/``
on POSIX or ``%LOCALAPPDATA%\\aso-skill\\itunes\\`` on Windows). TTL defaults to
24h and is overridable via the ``ASO_ITUNES_TTL_SECONDS`` env var. Set
``ASO_ITUNES_NO_CACHE=1`` to bypass entirely.

Failure modes are tolerant: cache write errors, unreadable cache files, and
permission-denied on the cache directory all degrade gracefully to a live
fetch. The cache never raises through to the caller.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

_DEFAULT_TTL_SECONDS = 60 * 60 * 24


def _resolve_cache_dir() -> Path:
    """Resolve the cache directory, honouring XDG / LOCALAPPDATA / fallback to tempdir."""
    if sys.platform.startswith("win"):
        base = os.environ.get("LOCALAPPDATA")
        if base:
            return Path(base) / "aso-skill" / "itunes"
    xdg = os.environ.get("XDG_CACHE_HOME")
    if xdg:
        return Path(xdg) / "aso-skill" / "itunes"
    home = Path.home()
    if home and str(home) != "":
        return home / ".cache" / "aso-skill" / "itunes"
    return Path(tempfile.gettempdir()) / "aso-skill" / "itunes"


def _ttl_seconds() -> int:
    raw = os.environ.get("ASO_ITUNES_TTL_SECONDS")
    if not raw:
        return _DEFAULT_TTL_SECONDS
    try:
        ttl = int(raw)
        return ttl if ttl > 0 else _DEFAULT_TTL_SECONDS
    except ValueError:
        return _DEFAULT_TTL_SECONDS


def _bypass() -> bool:
    return os.environ.get("ASO_ITUNES_NO_CACHE", "").lower() in ("1", "true", "yes")


class ITunesCache:
    """Tiny URL-keyed disk cache for JSON responses."""

    def __init__(self, cache_dir: Optional[Path] = None, ttl_seconds: Optional[int] = None):
        self.cache_dir = Path(cache_dir) if cache_dir is not None else _resolve_cache_dir()
        self.ttl_seconds = ttl_seconds if ttl_seconds is not None else _ttl_seconds()
        self._writable: Optional[bool] = None

    def _key(self, url: str) -> str:
        return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]

    def _path_for(self, url: str) -> Path:
        return self.cache_dir / f"{self._key(url)}.json"

    def _ensure_writable(self) -> bool:
        if self._writable is True:
            return True
        if self._writable is False:
            return False
        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            probe = self.cache_dir / ".write_probe"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink()
            self._writable = True
        except OSError:
            self._writable = False
        return self._writable

    def get(self, url: str, allow_stale: bool = False) -> Optional[Dict[str, Any]]:
        """Return cached body if present (and fresh, unless ``allow_stale``)."""
        path = self._path_for(url)
        if not path.exists():
            return None
        try:
            entry = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            try:
                path.unlink()
            except OSError:
                # Best-effort cleanup: if the unreadable cache file can't be
                # removed either (permissions, race), proceed without it.
                pass
            return None
        if not allow_stale:
            fetched_at = entry.get("fetched_at", 0)
            if time.time() - fetched_at >= self.ttl_seconds:
                return None
        return entry.get("response")

    def put(self, url: str, response: Dict[str, Any]) -> None:
        """Store response. Silent no-op if the cache dir is not writable."""
        if not self._ensure_writable():
            return
        path = self._path_for(url)
        try:
            path.write_text(
                json.dumps(
                    {"fetched_at": time.time(), "url": url, "response": response},
                    default=str,
                ),
                encoding="utf-8",
            )
        except OSError:
            self._writable = False

    def clear(self) -> int:
        """Delete all cache files. Returns count removed."""
        if not self.cache_dir.exists():
            return 0
        removed = 0
        for entry in self.cache_dir.glob("*.json"):
            try:
                entry.unlink()
                removed += 1
            except OSError:
                # Best-effort delete; skip files we can't remove (in use,
                # permissions) rather than aborting the clear operation.
                pass
        return removed


_GLOBAL_CACHE: Optional[ITunesCache] = None


def _get_cache() -> ITunesCache:
    global _GLOBAL_CACHE
    if _GLOBAL_CACHE is None:
        _GLOBAL_CACHE = ITunesCache()
    return _GLOBAL_CACHE


def cached_urlopen(url: str, timeout: float = 10.0) -> Dict[str, Any]:
    """Fetch JSON from ``url`` with cache. Returns the decoded body as a dict.

    Honours ``ASO_ITUNES_NO_CACHE`` to bypass. On network failure, the cache is
    consulted as a fallback even past TTL — better stale data than no data.
    """
    cache = _get_cache()
    if not _bypass():
        hit = cache.get(url)
        if hit is not None:
            return hit
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            body = response.read()
        data = json.loads(body.decode("utf-8"))
    except (urllib.error.URLError, ValueError, OSError) as exc:
        stale = cache.get(url, allow_stale=True)
        if stale is not None:
            return stale
        return {"resultCount": 0, "results": [], "error": f"API request failed: {exc}"}
    if not _bypass():
        cache.put(url, data)
    return data
