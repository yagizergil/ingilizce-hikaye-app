"""Wikidata çözemediğinde/yanlış eşleştirdiğinde kullanılan elle
doldurulmuş yazar -> ölüm yılı önbelleği (pipeline/data/author_overrides.yaml)."""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from src.settings import AUTHOR_OVERRIDES_PATH

_TOKEN_RE = re.compile(r"[a-z]+")


def _tokens(name: str) -> set[str]:
    return set(_TOKEN_RE.findall(name.lower()))


def load_author_overrides(path: Path = AUTHOR_OVERRIDES_PATH) -> dict[str, int]:
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}
    overrides: dict[str, int] = {}
    for key, value in raw.items():
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError(
                f"author_overrides.yaml'da '{key}' için geçersiz değer: {value!r} (int olmalı)"
            )
        overrides[str(key)] = value
    return overrides


def find_author_override(author_name: str, overrides: dict[str, int]) -> int | None:
    """Anahtar isim, yazar isminin tam alt kümesiyse (tüm token'ları
    yazar isminde geçiyorsa) eşleşme sayılır — 'Mary Shelley' anahtarı
    EPUB'daki 'Mary Wollstonecraft Shelley' ile eşleşir."""
    if not author_name:
        return None
    author_tokens = _tokens(author_name)
    for key, year in overrides.items():
        key_tokens = _tokens(key)
        if key_tokens and key_tokens <= author_tokens:
            return year
    return None
