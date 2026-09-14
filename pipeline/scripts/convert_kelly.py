"""Kelly listesi (ssharoff.github.io/kelly, CC BY-NC-SA 2.0) .xls
dosyalarını ortak CEFR-J benzeri CSV şekline dönüştürür. CEFRLex ailesi
Fransızca/Almanca/İspanyolca'yı kapsıyordu ama İtalyanca/Rusça/Çince'yi
kapsamıyor -- Kelly projesi (2009-2012, AB destekli) bu boşluğu dolduran
ayrı bir akademik kaynak, 9 dil için CEFR-etiketli kelime listesi üretti.

Her dilin ham .xls'i FARKLI şemada (bkz. dosya başındaki NEDEN notları) --
bu yüzden dil başına ayrı bir `convert_xx()` fonksiyonu var, ortak
`_write()` çıktısı aynı.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/convert_kelly.py --lang it
    .venv/Scripts/python.exe scripts/convert_kelly.py --lang ru
"""

from __future__ import annotations

import argparse
from pathlib import Path

import xlrd

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PIPELINE_ROOT / "data"

_VALID_CEFR = {"A1", "A2", "B1", "B2", "C1", "C2"}


def _write(dst: Path, rows: list[tuple[str, str, str]]) -> None:
    import csv

    rows = sorted(set(rows))
    with open(dst, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["headword", "pos", "CEFR"])
        writer.writerows(rows)
    print(f"{len(rows)} kelime yazıldı -> {dst}")


def convert_it() -> None:
    """it_m3.xls: sütunlar Lemma, Pos, Points -- "Points" adı yanıltıcı,
    değeri gerçekte CEFR seviyesi (A1-C2)."""
    wb = xlrd.open_workbook(DATA_DIR / "it_m3.xls")
    sh = wb.sheet_by_index(0)
    rows: list[tuple[str, str, str]] = []
    for r in range(1, sh.nrows):
        word = str(sh.cell_value(r, 0)).strip().lower()
        pos = str(sh.cell_value(r, 1)).strip().lower()
        level = str(sh.cell_value(r, 2)).strip().upper()
        if not word or level not in _VALID_CEFR:
            continue
        rows.append((word, pos, level))
    _write(DATA_DIR / "kelly-vocabulary-profile-it-1.0.csv", rows)


def convert_ru() -> None:
    """ru_m3.xls: sütunlar Lemma, CEFR, POS, Frq abs, Frq ipm."""
    wb = xlrd.open_workbook(DATA_DIR / "ru_m3.xls")
    sh = wb.sheet_by_index(0)
    rows: list[tuple[str, str, str]] = []
    for r in range(1, sh.nrows):
        word = str(sh.cell_value(r, 0)).strip().lower()
        level = str(sh.cell_value(r, 1)).strip().upper()
        pos = str(sh.cell_value(r, 2)).strip().lower()
        if not word or level not in _VALID_CEFR:
            continue
        rows.append((word, pos, level))
    _write(DATA_DIR / "kelly-vocabulary-profile-ru-1.0.csv", rows)


def convert_zh() -> None:
    """zh_m3.xls: sütunlar Chinese, CEFR -- POS yok, boş bırakılıyor."""
    wb = xlrd.open_workbook(DATA_DIR / "zh_m3.xls")
    sh = wb.sheet_by_index(0)
    rows: list[tuple[str, str, str]] = []
    for r in range(1, sh.nrows):
        word = str(sh.cell_value(r, 0)).strip()
        level = str(sh.cell_value(r, 1)).strip().upper()
        if not word or level not in _VALID_CEFR:
            continue
        rows.append((word, "", level))
    _write(DATA_DIR / "kelly-vocabulary-profile-zh-1.0.csv", rows)


def convert_ar() -> None:
    """ar_m3.xls: karışık şema (çeviri egzersizi verisi) -- sütun 4 orijinal
    Arapça kelime, sütun 5 CEFR seviyesi (bkz. oturum notları)."""
    wb = xlrd.open_workbook(DATA_DIR / "ar_m3.xls")
    sh = wb.sheet_by_index(0)
    rows: list[tuple[str, str, str]] = []
    for r in range(1, sh.nrows):
        word = str(sh.cell_value(r, 4)).strip()
        level = str(sh.cell_value(r, 5)).strip().upper()
        if not word or level not in _VALID_CEFR:
            continue
        rows.append((word, "", level))
    _write(DATA_DIR / "kelly-vocabulary-profile-ar-1.0.csv", rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True, choices=["it", "ru", "zh", "ar"])
    args = parser.parse_args()
    if args.lang == "it":
        convert_it()
    elif args.lang == "ru":
        convert_ru()
    elif args.lang == "zh":
        convert_zh()
    else:
        convert_ar()


if __name__ == "__main__":
    main()
