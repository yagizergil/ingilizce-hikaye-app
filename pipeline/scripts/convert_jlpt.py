"""JLPT kelime listelerini (elzup/jlpt-word-list, MIT lisans) CEFR-J
benzeri CSV'ye dönüştürür. Diğer dillerin CEFRLex/Kelly listelerinden
FARKLI olarak bu kaynak MIT lisanslı -- ticari kullanım kısıtlaması yok.

JLPT -> CEFR eşlemesi kesin değil (bkz. araştırma raporu §2.3, JLPT'nin
kendi 2025 CEFR referans raporu): N5->A1, N4->A2, N3 A2/B1 arası (bu
dönüşümde B1'e atandı, çünkü N3 pratikte "orta seviye başlangıcı"),
N2->B1/B2 (B1'e atandı, muhafazakâr), N1->B2/C1 (B2'ye atandı -- JLPT'nin
kendi raporu "N1 bile C2 değil" diyor, C1'e sıçramak yanıltıcı olurdu).

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/convert_jlpt.py
"""

from __future__ import annotations

import csv
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PIPELINE_ROOT / "data"

# Muhafazakâr eşleme -- bkz. yukarıdaki NEDEN notu.
_JLPT_TO_CEFR = {
    "n5": "A1",
    "n4": "A2",
    "n3": "B1",
    "n2": "B1",
    "n1": "B2",
}


def main() -> None:
    rows: list[tuple[str, str, str]] = []
    seen: set[tuple[str, str]] = set()

    # Sırayla n5 -> n1: bir kelime birden fazla listede geçerse (JLPT
    # dosyaları örtüşüyor, "tags" sütunu bunu doğruluyor) EN DÜŞÜK
    # seviyesi kazanır -- ilk görülen kayıt tutulur.
    for level_code in ["n5", "n4", "n3", "n2", "n1"]:
        path = DATA_DIR / f"jlpt_{level_code}.csv"
        with open(path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                word = row["expression"].strip()
                if not word:
                    continue
                key = (word, "")
                if key in seen:
                    continue
                seen.add(key)
                rows.append((word, "", _JLPT_TO_CEFR[level_code]))

    rows.sort()
    dst = DATA_DIR / "jlpt-vocabulary-profile-ja-1.0.csv"
    with open(dst, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["headword", "pos", "CEFR"])
        writer.writerows(rows)
    print(f"{len(rows)} kelime yazıldı -> {dst}")


if __name__ == "__main__":
    main()
