"""ELELex.tsv -> data/elelex-vocabulary-profile-es-1.0.csv (CEFR-J benzeri şekil).

NEDEN BU BETİK VAR: ELELex ham hâliyle her kelime için 5 seviyenin (A1-C1)
SÜREKLİ frekansını veriyor ("word X A1'de şu sıklıkta, A2'de şu sıklıkta...").
`profiler.py`nin coverage/kapsam mantığı ise CEFR-J listesindeki gibi HER
kelimeye TEK bir CEFR seviyesi atanmış, kesin bir liste bekliyor. Bu betik
sürekli frekans profilini tek-seviye atamaya indirger.

YÖNTEM (v1, kabaca): her kelimenin sütununu KENDİ seviyesinin toplam
frekans kütlesine göre normalize et (bir seviyede kelime doğal olarak daha
sık görünüyorsa bu, o kelimenin gerçekten o seviyeye "ait" olduğunu
göstermez — sadece o seviyenin metin hacmi daha büyük olabilir). Sonra en
yüksek normalize değeri veren seviyeyi ata (bir tür "argmax / göreli
tepe noktası" -- CEFRLex'in kendi metodolojisi kadar hassas değil ama
CEFR-J'nin de resmi bir psikometrik test değil, benzer bir frekans türevi
olduğunu unutmayın). AÇIKÇA YAKLAŞIKTIR — pilot parti geçtikten sonra
gerekirse insan gözden geçirmesiyle düzeltilebilir.

ELELex C2 SEVİYESİ İÇERMİYOR (yalnızca A1-C1). B2 üstü İspanyolca içerik
şimdilik bu listeyle üretilemez -- CEFR-J+Octanove'un C1/C2 için ayrı
kaynak kullanmasıyla aynı durum, İspanyolca için henüz o ikinci kaynak yok.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/convert_elelex.py
"""

from __future__ import annotations

import csv
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
SRC_PATH = PIPELINE_ROOT / "data" / "ELELex.tsv"
DST_PATH = PIPELINE_ROOT / "data" / "elelex-vocabulary-profile-es-1.0.csv"

LEVELS = ["a1", "a2", "b1", "b2", "c1"]

# FreeLing/EAGLES etiketinin İLK harfi -> profiler.py'deki CEFR POS bucket
# adı (_SPACY_TO_CEFR_POS ile aynı kova adları, ki spaCy es_core_news_sm
# UPOS çıktısıyla profiler.py zaten bu adlara çeviriyor).
_TAG_PREFIX_TO_BUCKET = {
    "N": "noun",
    "V": "verb",
    "A": "adjective",
    "R": "adverb",
    "D": "determiner",
    "P": "pronoun",
    "C": "conjunction",
    "S": "preposition",
    "I": "interjection",
    "Z": "number",
}


def _bucket_for_tag(tag: str) -> str:
    prefix = tag.strip()[:1].upper()
    return _TAG_PREFIX_TO_BUCKET.get(prefix, "other")


def main() -> None:
    with open(SRC_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t", quotechar='"')
        rows = list(reader)

    # Her seviye sütununun toplam kütlesi -- normalize etmek için.
    level_totals = {
        level: sum(float(row[f"level_freq@{level}"]) for row in rows) for level in LEVELS
    }

    # Aynı (word, pos-bucket) çifti birden fazla ham satırda olabilir
    # (tag varyantları) -- frekansları birleştir.
    merged: dict[tuple[str, str], dict[str, float]] = {}
    for row in rows:
        word = row["word"].strip().lower()
        if not word:
            continue
        bucket = _bucket_for_tag(row["tag"])
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
        # Saf argmax, çok yaygın işlev kelimelerini ("a", "de", "el")
        # YANLIŞ seviyeye düşürüyordu: bu kelimeler her seviyede benzer
        # sıklıkta göründüğü için argmax gürültüye göre rastgele bir
        # seviyeyi seçiyor (örn. "a" edatı A2 çıkıyordu, A1 yerine).
        # Düzeltme: kelimenin ZİRVE değerinin en az %60'ına ilk ulaştığı
        # (en düşük) seviyeyi ata -- "ilk üretken kullanım seviyesi"
        # yaklaşımı (graded-reader literatüründeki yönteme benzer).
        # Yaygın kelimeler byutün seviyelerde zirveye yakın olduğu için
        # A1'e düşer; yalnızca üst seviyede beliren kelimeler (zirve tek
        # bir seviyede) o üst seviyede kalır.
        best_level = next(
            level for level in LEVELS if peak == 0 or normalized[level] >= 0.6 * peak
        )
        out_rows.append(
            {
                "headword": word,
                "pos": bucket,
                "CEFR": best_level.upper(),
            }
        )

    out_rows.sort(key=lambda r: (r["headword"], r["pos"]))

    with open(DST_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["headword", "pos", "CEFR"])
        writer.writeheader()
        writer.writerows(out_rows)

    print(f"{len(out_rows)} kelime yazıldı -> {DST_PATH}")


if __name__ == "__main__":
    main()
