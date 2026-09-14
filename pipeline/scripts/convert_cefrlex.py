"""CEFRLex ailesi (ELELex/FLELex/DAFlex) TSV dosyalarını ortak CEFR-J
benzeri tek-seviye CSV şekline dönüştürür. `convert_elelex.py`nin
genellenmiş hâli -- İspanyolca pilotundan sonra Fransızca (FLELex) ve
Almanca (DAFlex) eklenirken üç ayrı betik yazmak yerine tek, dil/şema
parametreli bir betiğe indirgendi.

İKİ ŞEMA VAR:
  - FLELex zaten hazır bir `level` sütunu taşıyor (araştırmacıların kendi
    metodolojisiyle hesaplanmış) -- onu OLDUĞU GİBİ kullanıyoruz, tekrar
    tahmin etmiyoruz.
  - ELELex/DAFlex yalnızca ham `level_freq@xx` sütunları veriyor -- bu
    durumda `convert_elelex.py`deki "zirveye göre ilk seviye" yöntemi
    uygulanıyor (bkz. aşağıdaki NEDEN notu, oradan taşındı).

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/convert_cefrlex.py --lang fr
    .venv/Scripts/python.exe scripts/convert_cefrlex.py --lang de
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PIPELINE_ROOT / "data"

LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"]

# Her dilin ham TSV'sindeki tag setinin İLK 2-3 harfi -> profiler.py'nin
# CEFR POS bucket adları. Fransızca (TreeTagger) ve Almanca (STTS)
# tagset'leri birbirinden farklı, bu yüzden dil başına ayrı harita.
_FR_TAG_TO_BUCKET = {
    "NOM": "noun",
    "VER": "verb",
    "ADJ": "adjective",
    "ADV": "adverb",
    "PRP": "preposition",
    "KON": "conjunction",
    "PRO": "pronoun",
    "DET": "determiner",
    "INT": "interjection",
    "NUM": "number",
}

# STTS (Stuttgart-Tübingen Tagset, Almanca) -- ilk harflere göre kaba eşleme.
_DE_TAG_PREFIX_TO_BUCKET = {
    "NN": "noun",
    "NE": "noun",
    "VV": "verb",
    "VA": "verb",
    "VM": "verb",
    "ADJ": "adjective",
    "ADV": "adverb",
    "APPR": "preposition",
    "APPO": "preposition",
    "KO": "conjunction",
    "PPER": "pronoun",
    "PDS": "pronoun",
    "PIS": "pronoun",
    "ART": "determiner",
    "PDAT": "determiner",
    "ITJ": "interjection",
    "CARD": "number",
}


def _fr_bucket(tag: str) -> str:
    base = tag.split(":")[0].strip().upper()
    return _FR_TAG_TO_BUCKET.get(base, "other")


def _de_bucket(tag: str) -> str:
    tag = tag.strip().upper()
    for prefix, bucket in sorted(_DE_TAG_PREFIX_TO_BUCKET.items(), key=lambda kv: -len(kv[0])):
        if tag.startswith(prefix):
            return bucket
    return "other"


def convert_flelex() -> None:
    src = DATA_DIR / "FLELex.tsv"
    dst = DATA_DIR / "flelex-vocabulary-profile-fr-1.0.csv"
    out_rows: list[dict[str, str]] = []
    with open(src, encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            word = row["word"].strip().lower()
            level = row["level"].strip().upper()
            if not word or level not in {lvl.upper() for lvl in LEVELS}:
                continue
            out_rows.append({"headword": word, "pos": _fr_bucket(row["tag"]), "CEFR": level})
    _write(dst, out_rows)


def convert_daflex() -> None:
    src = DATA_DIR / "DAFlex.tsv"
    dst = DATA_DIR / "daflex-vocabulary-profile-de-1.0.csv"
    with open(src, encoding="utf-8") as f:
        rows = list(csv.DictReader(f, delimiter="\t"))

    level_totals = {
        level: sum(float(row[f"level_freq@{level}"]) for row in rows) for level in LEVELS
    }

    merged: dict[tuple[str, str], dict[str, float]] = {}
    for row in rows:
        word = row["word"].strip().lower()
        if not word:
            continue
        bucket = _de_bucket(row["tag"])
        key = (word, bucket)
        acc = merged.setdefault(key, {level: 0.0 for level in LEVELS})
        for level in LEVELS:
            acc[level] += float(row[f"level_freq@{level}"])

    out_rows: list[dict[str, str]] = []
    for (word, bucket), freqs in merged.items():
        normalized = {
            level: (freqs[level] / level_totals[level] if level_totals[level] else 0.0)
            for level in LEVELS
        }
        peak = max(normalized.values())
        best_level = next(
            level for level in LEVELS if peak == 0 or normalized[level] >= 0.6 * peak
        )
        out_rows.append({"headword": word, "pos": bucket, "CEFR": best_level.upper()})
    _write(dst, out_rows)


def _write(dst: Path, out_rows: list[dict[str, str]]) -> None:
    out_rows.sort(key=lambda r: (r["headword"], r["pos"]))
    with open(dst, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["headword", "pos", "CEFR"])
        writer.writeheader()
        writer.writerows(out_rows)
    print(f"{len(out_rows)} kelime yazıldı -> {dst}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True, choices=["fr", "de"])
    args = parser.parse_args()
    if args.lang == "fr":
        convert_flelex()
    else:
        convert_daflex()


if __name__ == "__main__":
    main()
