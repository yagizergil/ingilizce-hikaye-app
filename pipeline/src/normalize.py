"""Kapsam ölçümü öncesi kelime normalizasyonu.

Bu katman SADECE profiling/coverage ölçümü için kullanılan bir çalışma
kopyası üzerinde çalışır — book_paragraphs.text olarak DB'ye yazılan asıl
metni asla değiştirmez (extract.py bu modülü hiç import etmez).
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from src.settings import NORMALIZATION_PATH

# Baştaki/sondaki apostrof da yakalanır ('em, o', goin', 'tis) — eski
# desen sadece kelime İÇİ apostrofu yakalıyordu, bu yüzden "goin'" tokenize
# sırasında "goin"e düşüyordu ve sözlük eşleşmesi (apostroflu anahtar)
# hiç denenmeden kayboluyordu. Apostrof burada SİLİNMİYOR, sadece
# tokenization aşamasında korunuyor; asıl temizlik normalize_word'de
# sözlük/kural eşleşmesinden SONRA yapılır.
_WORD_RE = re.compile(r"'?[A-Za-z]+(?:'[A-Za-z]+)*'?")
_ING_APOSTROPHE_SUFFIX = "in'"
_CURLY_APOSTROPHES = {"‘": "'", "’": "'", "ʼ": "'", "‛": "'"}


@dataclass(frozen=True)
class SuffixRule:
    from_suffix: str
    to_suffix: str
    exceptions: frozenset[str] = field(default_factory=frozenset)
    only: frozenset[str] | None = None


@dataclass(frozen=True)
class NormalizationMaps:
    bre_suffixes: tuple[SuffixRule, ...]
    word_map: dict[str, str]
    contractions: dict[str, str]
    eye_dialect: dict[str, str]


@dataclass
class NormalizedText:
    text: str
    total_words: int
    dialect_hits: int
    bre_ame_hits: int
    possessive_hits: int


def _reject_yaml_booleans(value: object, path: str) -> None:
    """YAML 1.1'de tırnaksız yes/no/on/off/true/false otomatik boolean'a
    çevrilir ("Norway problem" — `nay: no` -> Python'da `False`). Bunu
    sessizce str()'e çevirmek yerine açıkça reddediyoruz, çünkü `False`
    değeri gerçekten "no" mu yoksa gerçek bir yazım hatası mı olduğunu
    ayırt edemeyiz."""
    if isinstance(value, bool):
        raise ValueError(
            f"normalization.yaml'da tırnaksız boolean değer: {path} = {value!r}. "
            "Bu muhtemelen yes/no/true/false/on/off gibi bir kelimenin tırnaksız "
            "yazılmasından kaynaklanıyor (YAML 1.1 'Norway problem'). İlgili "
            "anahtarı/değeri tek tırnak içine al, örn. 'no' değil no."
        )
    if isinstance(value, dict):
        for key, sub_value in value.items():
            _reject_yaml_booleans(key, f"{path}.{key!r} (anahtar)")
            _reject_yaml_booleans(sub_value, f"{path}.{key!r}")
    elif isinstance(value, list):
        for i, item in enumerate(value):
            _reject_yaml_booleans(item, f"{path}[{i}]")


def load_normalization_maps(path: Path = NORMALIZATION_PATH) -> NormalizationMaps:
    with open(path, encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    _reject_yaml_booleans(raw, "normalization.yaml")

    suffixes = tuple(
        SuffixRule(
            from_suffix=str(item["from"]),
            to_suffix=str(item["to"]),
            exceptions=frozenset(str(w).lower() for w in item.get("exceptions", [])),
            only=frozenset(str(w).lower() for w in item["only"]) if "only" in item else None,
        )
        for item in raw.get("bre_to_ame_suffixes", [])
    )
    word_map = {str(k).lower(): str(v).lower() for k, v in raw.get("word_map", {}).items()}
    contractions = {
        str(k).lower(): str(v).lower() for k, v in raw.get("contractions", {}).items()
    }
    eye_dialect = {
        str(k).lower(): str(v).lower() for k, v in raw.get("eye_dialect", {}).items()
    }
    return NormalizationMaps(
        bre_suffixes=suffixes, word_map=word_map, contractions=contractions, eye_dialect=eye_dialect
    )


def _normalize_apostrophes(text: str) -> str:
    for curly, straight in _CURLY_APOSTROPHES.items():
        text = text.replace(curly, straight)
    return text


def _strip_possessive(word: str) -> tuple[str, bool]:
    if word.endswith("'s") and len(word) > 2:
        return word[:-2], True
    if word.endswith("s'") and len(word) > 2:
        return word[:-1], True
    return word, False


def _apply_bre_suffix(
    word: str,
    rules: tuple[SuffixRule, ...],
    is_known: Callable[[str], bool] | None = None,
) -> tuple[str, bool]:
    """is_known verilirse, dönüşüm SADECE sonucu is_known(candidate)
    True dönerse kabul edilir. Bu, istisna listesi bakımını gereksiz
    kılan genel bir güvenlik ağıdır: "your" -our-> "yor" gibi
    kelimenin kendisi tesadüfen bir BrE ekiyle bitmesinden kaynaklanan
    yanlış eşleşmeleri (rise->rize, arise->arize, enterprise->enterprize
    dahil) önler, çünkü "yor"/"rize"/"arize" gerçek kelimeler değildir
    ve is_known bunları reddeder."""
    for rule in rules:
        candidate: str | None = None
        if rule.only is not None:
            if word in rule.only:
                candidate = word[: -len(rule.from_suffix)] + rule.to_suffix
        else:
            if word in rule.exceptions:
                continue
            if word.endswith(rule.from_suffix) and len(word) > len(rule.from_suffix):
                candidate = word[: -len(rule.from_suffix)] + rule.to_suffix

        if candidate is None:
            continue
        if is_known is not None and not is_known(candidate):
            continue
        return candidate, True
    return word, False


def normalize_word(
    word: str,
    maps: NormalizationMaps,
    is_known: Callable[[str], bool] | None = None,
) -> tuple[str, str | None]:
    """Returns (normalized_word, category) where category is one of
    'contraction', 'eye_dialect', 'possessive', 'bre_ame', or None.

    is_known: verilirse (ör. CEFR sözlüğünde var mı), sadece suffix
    tabanlı BrE->AmE dönüşümlerini (_apply_bre_suffix) doğrular —
    word_map/eye_dialect/contractions zaten elle seçilmiş, tam kelime
    eşleşmeleri olduğu için yanlış-pozitif riski yok, bu yüzden
    doğrulamaya tabi tutulmazlar."""
    lower = word.lower()

    if lower in maps.contractions:
        return maps.contractions[lower], "contraction"

    if lower in maps.eye_dialect:
        return maps.eye_dialect[lower], "eye_dialect"

    # Sözlükte tek tek girilmemiş "-in'" biten ağız formları için genel
    # kural (goin', talkin', runnin', ...): -in' -> -ing. Sözlükteki
    # spesifik girdilere olan bağımlılığı azaltır; sözlük yine de önce
    # denenir (yukarıda), bu sadece fallback.
    if lower.endswith(_ING_APOSTROPHE_SUFFIX) and len(lower) > len(_ING_APOSTROPHE_SUFFIX):
        return lower[: -len(_ING_APOSTROPHE_SUFFIX)] + "ing", "eye_dialect"

    stripped, had_possessive = _strip_possessive(lower)
    base = stripped if had_possessive else lower

    if base in maps.word_map:
        mapped = maps.word_map[base]
        return mapped, "bre_ame"

    suffixed, had_suffix = _apply_bre_suffix(base, maps.bre_suffixes, is_known)
    if had_suffix:
        return suffixed, "bre_ame"

    if had_possessive:
        return base, "possessive"

    return lower, None


def normalize_text(text: str, maps: NormalizationMaps) -> NormalizedText:
    text = _normalize_apostrophes(text)
    words = _WORD_RE.findall(text)

    out_tokens: list[str] = []
    dialect_hits = 0
    bre_ame_hits = 0
    possessive_hits = 0

    for word in words:
        normalized, category = normalize_word(word, maps)
        out_tokens.extend(normalized.split())
        if category == "eye_dialect":
            dialect_hits += 1
        elif category == "bre_ame":
            bre_ame_hits += 1
        elif category == "possessive":
            possessive_hits += 1

    return NormalizedText(
        text=" ".join(out_tokens),
        total_words=len(words),
        dialect_hits=dialect_hits,
        bre_ame_hits=bre_ame_hits,
        possessive_hits=possessive_hits,
    )
