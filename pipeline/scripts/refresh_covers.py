"""Kitap kapaklarını yeniden üretir ve Supabase Storage'a yükler.

NEDEN AYRI BİR BETİK
--------------------
Kapak, `pipeline run` sırasında bir kez üretiliyor. Kapak tasarımı
değiştiğinde ya da bir kitaba yapay zekâ ile üretilmiş kapak
eklendiğinde, 60+ kitabı baştan `run` etmek (metin çıkarma, profilleme,
lemma üretimi, yayınlama) dakikalar sürer ve hiçbirine gerek yoktur —
değişen tek şey bir PNG.

`books.cover_url` deterministik bir depolama yolu
(`book-covers/<slug>.png`), yani depodaki nesneyi ÜZERİNE YAZMAK yeterli;
veritabanına hiç dokunulmuyor.

NEDEN REST, DOĞRUDAN POSTGRES DEĞİL
-----------------------------------
Pipeline'ın geri kalanı `db.<ref>.supabase.co` üzerinden doğrudan
bağlanıyor ve o ad bu makinede aralıklı olarak çözülemiyordu
(`getaddrinfo failed`) — 23 kitaplık bir toplu yayın bu yüzden yarıda
kalmıştı. Bu betik yalnızca okuma yapıyor ve REST uç noktasını
kullanıyor; o ad sorunsuz çözülüyor.

KULLANIM
--------
    cd pipeline

    # Tüm özgün kitaplara tipografik kapak
    .venv/Scripts/python.exe scripts/refresh_covers.py

    # Yalnızca belirli kitaplar
    .venv/Scripts/python.exe scripts/refresh_covers.py --slug the-blue-bowl

    # Hazır bir görseli (ör. yapay zekâ ile üretilmiş) tek kitaba uygula
    .venv/Scripts/python.exe scripts/refresh_covers.py \\
        --slug the-cat-that-belonged-to-everyone --image /path/to/cover.png
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.cover import generate_placeholder_cover, upload_cover  # noqa: E402
from src.settings import load_settings  # noqa: E402


def fetch_books(settings, slugs: list[str] | None) -> list[dict]:
    """Özgün kitapların kapak için gereken alanlarını REST üzerinden okur."""
    params = {
        "select": "slug,title,author,target_level,cefr_level,cover_url",
        "is_original": "eq.true",
        "order": "slug.asc",
    }
    if slugs:
        params["slug"] = f"in.({','.join(slugs)})"

    response = httpx.get(
        f"{settings.supabase_url}/rest/v1/books",
        params=params,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        },
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--slug",
        action="append",
        help="Yalnızca bu kitap(lar). Birden çok kez verilebilir.",
    )
    parser.add_argument(
        "--image",
        type=Path,
        help="Hazır bir görsel dosyası. Yalnızca TEK --slug ile birlikte kullanılır.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help=(
            "Kapağı zaten olan kitapların üzerine de yaz. VARSAYILAN OLARAK "
            "YAZMAZ — bkz. aşağıdaki gerekçe."
        ),
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.image and (not args.slug or len(args.slug) != 1):
        raise SystemExit("--image tam olarak bir --slug ile kullanılmalı.")

    settings = load_settings()
    books = fetch_books(settings, args.slug)

    if not books:
        raise SystemExit("Eşleşen kitap bulunamadı.")

    # VARSAYILAN OLARAK ÜZERİNE YAZMAZ.
    #
    # NEDEN: bu betiğin ilk çalıştırılışı 63 özgün kitabın HEPSİNE kapak
    # yazdı. Şans eseri kayıp olmadı — 39 A1/A2 hikâyesinin gerçek kapağı
    # `.jpg` uzantılıydı (bkz. scripts/upload_covers.py) ve bu betik `.png`
    # yazdığı için onlara dokunmadı, yalnızca kullanılmayan dosyalar bıraktı.
    # Uzantılar eşleşseydi 39 kapak geri dönüşsüz silinmiş olurdu.
    #
    # Var olan bir kapağı ezmek açık bir istek olmalı, varsayılan davranış
    # değil. `cover_url` deterministik yolun DIŞINDA bir şeyi gösteriyorsa
    # (ya da farklı uzantıdaysa) o kitabın kapağı elle konmuş demektir.
    def has_custom_cover(book: dict) -> bool:
        url = book.get("cover_url") or ""
        return bool(url) and not url.endswith(f"/{book['slug']}.png")

    if not args.force and not args.image:
        skipped = [book for book in books if has_custom_cover(book)]
        books = [book for book in books if not has_custom_cover(book)]
        if skipped:
            print(f"{len(skipped)} kitapta kapak zaten var, atlanıyor (--force ile ezilir)")

    if not books:
        print("Yazılacak kapak yok.")
        return 0

    print(f"{len(books)} kitap")

    for book in books:
        slug = book["slug"]

        if args.image:
            image_bytes = args.image.read_bytes()
            source = f"dosya: {args.image.name}"
        else:
            image_bytes = generate_placeholder_cover(
                book["title"],
                book.get("author"),
                book.get("target_level") or book.get("cefr_level"),
            )
            source = "tipografik"

        if args.dry_run:
            print(f"  {slug:<40} {source} ({len(image_bytes)} bayt) — yazılmadı")
            continue

        upload_cover(settings, slug, image_bytes, "png")
        print(f"  {slug:<40} {source} ({len(image_bytes)} bayt)")

    if not args.dry_run:
        print(
            "\nBitti. `books.cover_url` deterministik yol olduğu için veritabanına "
            "dokunulmadı; istemcideki görsel önbelleği bir süre eski kapağı "
            "gösterebilir."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
