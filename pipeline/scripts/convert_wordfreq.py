"""wordfreq (MIT lisans, rspeer/wordfreq) kütüphanesinden Türkçe için
frekans-tabanlı bir CEFR YAKLAŞIKLIĞI üretir.

NEDEN BU YÖNTEM: Türkçe için hiçbir açık lisanslı, hazır CEFR kelime
listesi bulunamadı (CEFRLex'te yok, Kelly List'te yok -- yalnızca 9 dili
kapsıyorlar, ikisi de Türkçe değil). Araştırma raporunun (2026-09-13)
önerdiği gibi ("tr/ar/uk için hiç ölçülemez... frekans tabanlı bir vekile
düşmek zorunda") frekans sırasını kaba bir CEFR vekiline dönüştürüyoruz:
en sık kullanılan N kelime A1, sonraki N*2 kelime A2, vb.

BU AÇIKÇA YAKLAŞIKTIR -- gerçek bir CEFR listesi (öğretim materyali
korpusundan, TYS/Yunus Emre Enstitüsü müfredatından türetilmiş) bunun
yerini almalı, ama böyle bir kaynak bulunana kadar bu, "hiç kelime
kısıtlaması yok" durumundan kesinlikle daha iyi bir başlangıç noktası.

Eşik sayıları CEFR-J'nin (İngilizce) kabaca gözlemlenen basamak
büyüklükleriyle orantılı seçildi (A1 ~1.500, A2 ~1.500 ek, vb.) ama
Türkçe'nin sondan eklemeli morfolojisi nedeniyle (bkz. ADR-008) tek bir
"kelime" çok sayıda yüzey formuna karşılık geliyor -- bu yaklaşıklığı
daha da kabalaştırıyor. `check_story`'nin lemma eşleşmesi (Stanza
lemmatizer) bunu kısmen telafi ediyor.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/convert_wordfreq.py --lang tr
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from wordfreq import top_n_list

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PIPELINE_ROOT / "data"

# (seviye, o seviyeye kadar KÜMÜLATİF kelime sayısı) -- bkz. yukarıdaki NEDEN notu.
_LEVEL_CUTOFFS = [
    ("A1", 1500),
    ("A2", 3000),
    ("B1", 6000),
    ("B2", 10000),
    ("C1", 16000),
]


def convert(lang: str) -> None:
    words = top_n_list(lang, _LEVEL_CUTOFFS[-1][1])
    rows: list[tuple[str, str, str]] = []
    cutoff_idx = 0
    for i, word in enumerate(words):
        while i >= _LEVEL_CUTOFFS[cutoff_idx][1]:
            cutoff_idx += 1
        rows.append((word, "", _LEVEL_CUTOFFS[cutoff_idx][0]))

    dst = DATA_DIR / f"wordfreq-vocabulary-profile-{lang}-1.0.csv"
    with open(dst, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["headword", "pos", "CEFR"])
        writer.writerows(rows)
    print(f"{len(rows)} kelime yazıldı -> {dst}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True)
    args = parser.parse_args()
    convert(args.lang)


if __name__ == "__main__":
    main()
