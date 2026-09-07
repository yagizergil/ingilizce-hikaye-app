"""Aşamalar arası ara çıktı önbelleği (aynı process değiller, her CLI
komutu ayrı bir Python süreci — bir sonraki aşama öncekinin çıktısını
diskten okur)."""

from __future__ import annotations

import pickle
from pathlib import Path

from src.settings import PIPELINE_ROOT

WORK_DIR = PIPELINE_ROOT / "work"


def _path(slug: str, name: str) -> Path:
    book_dir = WORK_DIR / slug
    book_dir.mkdir(parents=True, exist_ok=True)
    return book_dir / f"{name}.pkl"


def save(slug: str, name: str, obj: object) -> None:
    with open(_path(slug, name), "wb") as f:
        pickle.dump(obj, f)


def load[T](slug: str, name: str, expected_type: type[T]) -> T:
    path = _path(slug, name)
    if not path.exists():
        raise FileNotFoundError(
            f"'{name}' önbelleği '{slug}' için bulunamadı ({path}). "
            "Önceki aşamayı çalıştır."
        )
    with open(path, "rb") as f:
        obj = pickle.load(f)
    if not isinstance(obj, expected_type):
        raise TypeError(f"{path} beklenmeyen tip: {type(obj)}")
    return obj
