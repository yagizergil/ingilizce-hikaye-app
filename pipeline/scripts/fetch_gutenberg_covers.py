"""Klasiklerin GERÇEK kapak görsellerini Project Gutenberg'den indirir.

NEDEN: klasiklere tipografik yer tutucu kapak üretiliyordu (başlık + yazar
+ seviye, düz renk zemin). İngilizce klasiklerde ise gerçek kapak
görselleri kullanılıyor ve aradaki fark kütüphane rafında hemen görünüyor
-- aynı katalogda iki farklı kalitede kapak duruyordu.

Gutenberg her eser için kapak görselini şu adreste sunuyor:
    https://www.gutenberg.org/cache/epub/<id>/pg<id>.cover.medium.jpg

`gutenberg_id` zaten indirme sırasında `classics_<lang>/<slug>.json`
içine yazılmıştı, yani yeni bir eşleştirme tablosuna gerek yok.

GERÇEKTEN KAPAK MI, YER TUTUCU MU: Gutenberg bazı eserlerde kapak yerine
otomatik üretilmiş düz bir görsel veriyor. Bunlar ÇOK KÜÇÜK dosyalar
oluyor; boyut eşiğinin altındakiler atlanıyor ve o kitap mevcut
tipografik kapağıyla kalıyor. Kötü bir kapağı iyisiyle değiştirmek amaç;
kötüyü başka bir kötüyle değiştirmek değil.

ÇIKTI: 600x900 JPEG (mevcut kapak sözleşmesi, bkz. upload_covers.py) ve
`books.cover_url` güncellemesi.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/fetch_gutenberg_covers.py --lang all
    .venv/Scripts/python.exe scripts/fetch_gutenberg_covers.py --lang de --dry-run
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx  # noqa: E402
import psycopg  # noqa: E402
from PIL import Image  # noqa: E402

from src.settings import load_settings  # noqa: E402

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
HEADERS = {"User-Agent": "lingo-pipeline/1.0 (public-domain corpus builder)"}
BUCKET = "book-covers"
TARGET_SIZE = (600, 900)
JPEG_QUALITY = 88

#: Bu boyutun altındaki dosya Gutenberg'in otomatik ürettiği düz görsel
#: olma ihtimali yüksek -- ölçüldü: gerçek kapaklar 11-32 KB, otomatik
#: üretilenler 3 KB'ın altında.
MIN_COVER_BYTES = 6000

#: Kapak görseli her değiştiğinde ARTIRILIR (bkz. `upload`).
COVER_VERSION = 2

LANGUAGES = ["de", "es", "fr", "it", "ja", "ru", "zh", "en"]


def cover_url_for(gutenberg_id: int) -> str:
    return f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.cover.medium.jpg"


def to_cover_jpeg(raw: bytes) -> bytes:
    """Kapağı 600x900 ÇERÇEVEYİ DOLDURACAK şekilde ölçekler.

    ÖNCE SIĞDIRMA (thumbnail + ortalama) yapılıyordu ve sonuç ekranda
    küçücük kalıyordu: Gutenberg kapakları yalnızca ~200x300 piksel
    (ölçüldü), 600x900 tuvalin ortasına konduğunda etrafında kocaman bir
    boşluk oluşuyordu. Uygulamadaki kapak kutusu 132x194 pt ve çerçevenin
    TAMAMINI dolduruyor -- yer tutucu kapaklar da öyle. İki farklı
    doluluk aynı rafta yan yana durunca fark hemen görünüyordu.

    Şimdi kısa kenar hedefe eşitlenip uzun kenardan ORTADAN kırpılıyor.
    Kitap kapakları zaten ~1.5 oranında olduğu için kırpılan miktar
    küçük; kırpma ortadan yapıldığı için de başlık genellikle korunuyor.
    """
    image = Image.open(io.BytesIO(raw)).convert("RGB")

    target_ratio = TARGET_SIZE[0] / TARGET_SIZE[1]
    source_ratio = image.width / image.height

    if source_ratio > target_ratio:
        # Kaynak daha geniş: yüksekliği eşitle, yanlardan kırp.
        new_height = TARGET_SIZE[1]
        new_width = max(TARGET_SIZE[0], round(image.width * new_height / image.height))
    else:
        # Kaynak daha dar: genişliği eşitle, üstten/alttan kırp.
        new_width = TARGET_SIZE[0]
        new_height = max(TARGET_SIZE[1], round(image.height * new_width / image.width))

    image = image.resize((new_width, new_height), Image.LANCZOS)
    left = (new_width - TARGET_SIZE[0]) // 2
    top = (new_height - TARGET_SIZE[1]) // 2
    image = image.crop((left, top, left + TARGET_SIZE[0], top + TARGET_SIZE[1]))

    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=JPEG_QUALITY, optimize=True)
    return buffer.getvalue()


def upload(settings, slug: str, data: bytes) -> str:
    url = f"{settings.supabase_url}/storage/v1/object/{BUCKET}/{slug}.jpg"
    response = httpx.put(
        url,
        content=data,
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
        },
        timeout=60.0,
    )
    response.raise_for_status()
    # SÜRÜM PARAMETRESİ ZORUNLU: aynı adrese yeniden yükleme yapıldığında
    # hem Supabase CDN'i hem de cihazdaki `expo-image` önbelleği ESKİ
    # görseli sunmaya devam ediyor (ölçüldü: kapaklar düzeltildiği hâlde
    # telefonda eski, siyah bantlı hâli görünüyordu). URL'yi değiştirmek
    # her iki önbelleği de atlatıyor; içerik değişmediyse aynı sürüm
    # kalıyor, yani gereksiz indirme olmuyor.
    return f"{settings.supabase_url}/storage/v1/object/public/{BUCKET}/{slug}.jpg?v={COVER_VERSION}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    languages = LANGUAGES if args.lang == "all" else [args.lang]
    settings = load_settings()

    # slug -> gutenberg_id eşlemesi indirme sırasındaki künyelerden.
    gutenberg_ids: dict[str, int] = {}
    for language in languages:
        for meta_path in (PIPELINE_ROOT / f"classics_{language}").glob("*.json"):
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            book_id = meta.get("gutenberg_id")
            if book_id:
                gutenberg_ids[f"{meta_path.stem}-{language}"] = book_id
                gutenberg_ids[meta_path.stem] = book_id

    print(f"{len(gutenberg_ids)} künye okundu.")

    with psycopg.connect(settings.database_url, autocommit=False) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select id, slug, target_language
                from public.books
                where status in ('published', 'needs_review')
                  and not is_original
                  and target_language = any(%s)
                """,
                (languages,),
            )
            rows = cur.fetchall()

        replaced = 0
        skipped = 0

        with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=60.0) as client:
            for book_id, slug, language in rows:
                gutenberg_id = gutenberg_ids.get(slug)
                if not gutenberg_id:
                    skipped += 1
                    continue

                try:
                    response = client.get(cover_url_for(gutenberg_id))
                except httpx.TransportError as error:
                    print(f"  {slug}: ağ hatası ({error})")
                    skipped += 1
                    continue

                if response.status_code != 200 or len(response.content) < MIN_COVER_BYTES:
                    print(
                        f"  {slug}: kapak yok/çok küçük "
                        f"(HTTP {response.status_code}, {len(response.content)} bayt)"
                    )
                    skipped += 1
                    continue

                if args.dry_run:
                    print(f"  {slug}: {len(response.content)} baytlık kapak bulundu")
                    replaced += 1
                    continue

                try:
                    jpeg = to_cover_jpeg(response.content)
                except OSError as error:
                    print(f"  {slug}: görsel açılamadı ({error})")
                    skipped += 1
                    continue

                public_url = upload(settings, slug, jpeg)
                with conn.cursor() as cur:
                    cur.execute(
                        "update public.books set cover_url = %s where id = %s",
                        (public_url, book_id),
                    )
                replaced += 1
                print(f"  {slug} -> gerçek kapak")

        if not args.dry_run:
            conn.commit()

    print(f"\nDEĞİŞEN: {replaced}   ATLANAN: {skipped}")


if __name__ == "__main__":
    main()
