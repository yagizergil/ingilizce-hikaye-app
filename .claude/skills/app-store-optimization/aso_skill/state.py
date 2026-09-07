"""Minimal per-app state store for the ASO skill.

Each app gets one ``outputs/<app>/.state/current.json`` file recording the
last-known values of its metadata, keyword set, ASO score, and competitor
list. Writes are atomic (write-to-temp then rename) so a crash during save
cannot corrupt the file.

This is the foundation for the ASO Watcher (diff competitor metadata over
time) and resume-on-failure flows. The API is deliberately small — load,
save, the path it lives at. Diffing is left to callers, who know better
what counts as a meaningful change for their use case.
"""

from __future__ import annotations

import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, Optional

CURRENT_SCHEMA_VERSION = 1

# Top-level slots a state document may contain. Unknown keys are preserved
# on load so future schema additions don't lose data written by newer
# clients running through older code.
_KNOWN_SLOTS = (
    "apple_metadata",
    "google_metadata",
    "keyword_set",
    "last_aso_score",
    "competitors",
)


def _empty_state(app_name: str) -> Dict[str, Any]:
    return {
        "schema_version": CURRENT_SCHEMA_VERSION,
        "app_name": app_name,
        "last_updated": None,
        "apple_metadata": None,
        "google_metadata": None,
        "keyword_set": None,
        "last_aso_score": None,
        "competitors": None,
    }


def _utc_now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


class StateStore:
    """Read / write per-app state under ``<base_dir>/<app>/.state/current.json``."""

    def __init__(self, app_name: str, base_dir: Optional[Path] = None):
        if not app_name or not str(app_name).strip():
            raise ValueError("app_name must be non-empty")
        self.app_name = app_name
        self.base_dir = Path(base_dir) if base_dir is not None else Path("outputs")

    @property
    def state_dir(self) -> Path:
        return self.base_dir / self.app_name / ".state"

    @property
    def path(self) -> Path:
        return self.state_dir / "current.json"

    def exists(self) -> bool:
        return self.path.is_file()

    def load(self) -> Dict[str, Any]:
        """Return the current state, or a fresh empty state if no file exists."""
        if not self.path.is_file():
            return _empty_state(self.app_name)
        body = self.path.read_text(encoding="utf-8")
        data = json.loads(body)
        if not isinstance(data, dict):
            raise ValueError(f"state file is not a JSON object: {self.path}")
        return self._migrate(data)

    def save(self, state: Dict[str, Any]) -> Path:
        """Atomically write ``state`` to disk. Returns the final path.

        Stamps ``schema_version`` and ``last_updated`` automatically; the
        caller does not need to set them.
        """
        if not isinstance(state, dict):
            raise TypeError("state must be a dict")
        merged = _empty_state(self.app_name)
        merged.update(state)
        merged["schema_version"] = CURRENT_SCHEMA_VERSION
        merged["app_name"] = self.app_name
        merged["last_updated"] = _utc_now_iso()

        self.state_dir.mkdir(parents=True, exist_ok=True)
        # Write to a sibling temp file then rename — POSIX guarantees the
        # rename is atomic, so readers always see a complete document.
        fd, tmp_path = tempfile.mkstemp(
            prefix="current.", suffix=".json.tmp", dir=str(self.state_dir)
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(merged, handle, indent=2, default=str)
                handle.write("\n")
            os.replace(tmp_path, self.path)
        except Exception:
            try:
                os.unlink(tmp_path)
            except OSError:
                # The temp file may already be gone (rename succeeded then
                # something else failed) — best-effort cleanup either way.
                pass
            raise
        return self.path

    def update(self, **slots: Any) -> Dict[str, Any]:
        """Load, merge the given slots in, save. Returns the new state."""
        unknown = set(slots) - set(_KNOWN_SLOTS)
        if unknown:
            raise ValueError(f"unknown state slot(s): {sorted(unknown)}")
        current = self.load()
        current.update(slots)
        self.save(current)
        return current

    @staticmethod
    def _migrate(data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply schema migrations. Currently a no-op; v1 is the only schema."""
        version = data.get("schema_version", CURRENT_SCHEMA_VERSION)
        if version > CURRENT_SCHEMA_VERSION:
            raise ValueError(
                f"state file schema_version={version} is newer than this code "
                f"({CURRENT_SCHEMA_VERSION}); upgrade aso_skill"
            )
        return data
