"""Public domain klasiklerin tür/tema etiketlerini doldurur.

NEDEN GEREKLİ (2026-09-07): ana sayfadaki "Türler ve Konular" rafı
`books.genres` / `books.themes` sütunlarından besleniyor. Yayındaki 85
kitabın 46'sında (Standard Ebooks kaynaklı klasiklerin TAMAMI) bu iki
sütun boştu — yalnızca pipeline'dan geçen 39 özgün hikâyenin frontmatter'ı
etiket taşıyordu (bkz. `backfill_genres_themes.py`, o script yalnızca
frontmatter'lı dosyalar için çalışır; klasiklerin frontmatter'ı yok).

Sonuç: kataloğun yarısı, üstelik kullanıcının tanıdığı yarısı
(Frankenstein, Sherlock Holmes, Alice, Oz) hiçbir kategori kartında
görünmüyordu.

Etiketler elle küratörlü: klasiklerin türü herkesçe bilinen bir şey,
otomatik çıkarım burada hem gereksiz hem hataya açık olurdu. İlk `genres`
değeri kitabın ana türü sayılıyor (uygulama `book.genre` olarak onu
okuyor, bkz. `mapBookRow.ts`).

Kullanım:
    pipeline/.venv/Scripts/python.exe pipeline/scripts/tag_classics.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# slug -> (genres, themes). İlk tür = ana tür.
TAGS: dict[str, tuple[list[str], list[str]]] = {
    "a-a-milne-the-house-at-pooh-corner": (["fantasy", "family"], ["friendship", "kindness"]),
    "a-a-milne-winnie-the-pooh": (["fantasy", "family"], ["friendship", "kindness"]),
    "arthur-conan-doyle-his-last-bow": (["mystery"], ["courage", "loyalty"]),
    "arthur-conan-doyle-the-adventures-of-sherlock-holmes": (["mystery"], ["trust"]),
    "arthur-conan-doyle-the-sign-of-the-four": (["mystery", "adventure"], ["trust"]),
    "barrie-peter-and-wendy-illustrations": (["fantasy", "adventure"], ["friendship", "growing-up"]),
    "charles-dickens-a-christmas-carol": (["drama", "fantasy"], ["kindness", "forgiveness", "family"]),
    "charles-dickens-the-mystery-of-edwin-drood": (["mystery", "drama"], []),
    "confucius-analects-james-legge": (["philosophy"], ["responsibility"]),
    "dostoyevsky-white-nights-and-other-stories": (["romance", "drama"], ["connection"]),
    "franklin-w-dixon-the-great-airport-mystery": (["mystery", "adventure"], ["courage"]),
    "franz-kafka-the-castle-willa-muir-edwin-muir": (["drama", "philosophy"], ["perseverance"]),
    "fyodor-dostoevsky-notes-from-underground-constance-garnett": (["philosophy", "drama"], []),
    "h-c-mcneile-the-black-gang": (["adventure", "mystery"], ["courage"]),
    "h-g-wells-the-invisible-man": (["science-fiction", "gothic"], []),
    "h-g-wells-the-time-machine": (["science-fiction", "adventure"], ["change"]),
    "h-g-wells-the-war-of-the-worlds": (["science-fiction", "adventure"], ["resilience"]),
    "h-p-lovecraft-at-the-mountains-of-madness": (["gothic", "science-fiction"], ["nature"]),
    "henry-james-the-turn-of-the-screw": (["gothic", "mystery"], []),
    "jack-london-the-call-of-the-wild": (["adventure", "drama"], ["nature", "resilience"]),
    "jane-austen-persuasion": (["romance", "drama"], ["family", "patience"]),
    "jane-austen-pride-and-prejudice": (["romance", "drama"], ["family"]),
    "joseph-conrad-heart-of-darkness": (["adventure", "drama"], []),
    "joseph-conrad-suspense": (["adventure", "drama"], []),
    "joseph-conrad-the-rescue": (["romance", "adventure"], ["loyalty"]),
    "jules-verne-around-the-world-in-eighty-days-george-makepeace-towle": (["adventure"], ["courage", "perseverance"]),
    "kahlil-gibran-the-madman": (["philosophy"], []),
    "l-frank-baum-dorothy-and-the-wizard-in-oz": (["fantasy", "adventure"], ["friendship", "courage"]),
    "l-frank-baum-ozma-of-oz": (["fantasy", "adventure"], ["friendship", "courage"]),
    "l-frank-baum-the-marvelous-land-of-oz": (["fantasy", "adventure"], ["friendship"]),
    "l-frank-baum-the-road-to-oz": (["fantasy", "adventure"], ["friendship"]),
    "l-frank-baum-the-wonderful-wizard-of-oz": (["fantasy", "adventure"], ["friendship", "courage"]),
    "lewis-carroll-alices-adventures-in-wonderland-john-tenniel": (["fantasy", "comedy"], []),
    "lewis-carroll-through-the-looking-glass-john-tenniel": (["fantasy", "comedy"], []),
    "marcus-aurelius-meditations-george-long": (["philosophy"], ["patience", "resilience"]),
    "maria-edgeworth-castle-rackrent": (["drama"], ["family", "tradition"]),
    "mary-shelley-frankenstein": (["gothic", "science-fiction"], []),
    "mor-jokai-midst-the-wild-carpathians-robert-nisbet-bain": (["romance", "adventure"], ["courage"]),
    "oscar-wilde-a-woman-of-no-importance": (["romance", "drama"], ["family"]),
    "oscar-wilde-childrens-stories": (["fantasy"], ["kindness"]),
    "oscar-wilde-lady-windermeres-fan": (["romance", "drama"], ["trust"]),
    "oscar-wilde-the-importance-of-being-earnest": (["comedy", "romance"], []),
    "robert-louis-stevenson-the-strange-case-of-dr-jekyll-and-mr-hyde": (["gothic", "mystery"], []),
    "virginia-woolf-orlando": (["drama", "fantasy"], ["change"]),
    "walter-white-the-fire-in-the-flint": (["drama"], ["courage", "community"]),
    "willa-cather-the-professors-house": (["drama"], ["family", "change"]),
}


def main() -> int:
    ok = 0
    with httpx.Client(timeout=120) as client:
        headers = {
            "Authorization": f"Bearer {SERVICE_KEY}",
            "apikey": SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        for slug, (genres, themes) in TAGS.items():
            response = client.patch(
                f"{SUPABASE_URL}/rest/v1/books",
                params={"slug": f"eq.{slug}", "select": "slug"},
                json={"genres": genres, "themes": themes},
                headers=headers,
            )
            if response.status_code >= 300:
                print(f"  x {slug}: {response.status_code} {response.text[:120]}")
                continue
            if not response.json():
                print(f"  x {slug}: eslesen kitap yok")
                continue
            print(f"  + {slug}: {genres[0]}")
            ok += 1

    print(f"\n{ok}/{len(TAGS)} kitap etiketlendi.")
    return 0 if ok == len(TAGS) else 1


if __name__ == "__main__":
    raise SystemExit(main())
