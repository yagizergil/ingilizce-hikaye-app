"""Wikisource'tan kamu malı metin indirir (Türkçe ve Arapça için).

NEDEN BU KAYNAK: Project Gutenberg'de Türkçe ve Arapça eser SAYISI SIFIR
(Gutendex ölçümü, 2026-09-15). Hindawi'nin Arapça arşivi programatik
erişime kapalı (403). Wikisource ise her iki dilde de gerçek edebiyat
taşıyor ve açık bir API'si var.

NEDEN KÜRATÖRLÜ YAZAR LİSTESİ, KATEGORİ TARAMASI DEĞİL: Wikisource'un
kategori yapısı dilden dile tutarsız (Türkçe'de yazar kategorileri
neredeyse boş -- ölçüldü). Ayrıca kamu malı kararı YAZARA bağlı ve o
karar bir insanın vermesi gereken bir şey: aşağıdaki listedeki her yazar
için ölüm yılı elle doğrulandı ve + 70 kuralını geçiyor. Otomatik tarama,
telifli bir yazarı sessizce içeri alabilirdi.

SEVİYE: listedeki yazarlar bilinçli olarak KISA ÖYKÜ yazarları. Araştırma
raporunun (§3) önerisi buydu: uzun klasikler A1-B1 öğrenci için
ulaşılamaz, kısa öykü ise aynı telif serbestliğiyle gelir ve okunabilir.
Ömer Seyfettin'in öyküleri 1.000-4.000 kelime; Cibran'ınkiler benzer.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/fetch_wikisource.py --lang tr --count 40
    .venv/Scripts/python.exe scripts/fetch_wikisource.py --lang ar --count 30
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import time
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import httpx

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
#: Wikimedia'nın kullanıcı-ajanı politikası İLETİŞİM BİLGİSİ istiyor;
#: taşımayan istekler 403 dönüyor (ölçüldü: jenerik bir ajanla tüm arama
#: çağrıları reddedildi). Politika: https://meta.wikimedia.org/wiki/User-Agent_policy
HEADERS = {
    "User-Agent": (
        "LingoPipeline/1.0 (https://yagizergil.github.io/ingilizce-hikaye-app/support.html) "
        "python-httpx"
    )
}

#: Yazar -> ölüm yılı. Her biri elle doğrulandı ve ölüm + 70 < 2026.
#:
#: Türkçe: Ömer Seyfettin modern Türk öyküsünün kurucusu ve dili
#: BİLİNÇLİ OLARAK SADE (Yeni Lisan hareketi) -- dil öğrencisi için
#: katalogdaki en uygun klasik. Ahmet Rasim ve Hüseyin Rahmi de sade
#: İstanbul Türkçesiyle yazıyor.
#:
#: Arapça: Cibran'ın ARAPÇA eserleri (İngilizce "The Prophet" değil) ve
#: el-Menfaluti'nin denemeleri -- ikisi de modern standart Arapçanın
#: kurucu metinleri, klasik Arapça değil.
CURATED_AUTHORS = {
    "tr": [
        ("Ömer Seyfettin", 1920),
        ("Ahmet Rasim", 1932),
        ("Hüseyin Rahmi Gürpınar", 1944),
        ("Ziya Gökalp", 1924),
        ("Tevfik Fikret", 1915),
    ],
    "ar": [
        ("جبران خليل جبران", 1931),
        ("مصطفى لطفي المنفلوطي", 1924),
        ("أحمد شوقي", 1932),
        ("حافظ إبراهيم", 1932),
    ],
}

MIN_CHARS = 2500
MAX_CHARS = 120_000


def api_url(lang: str) -> str:
    return f"https://{lang}.wikisource.org/w/api.php"


def search_pages(client: httpx.Client, lang: str, author: str, limit: int) -> list[str]:
    response = client.get(
        api_url(lang),
        params={
            "action": "query",
            "list": "search",
            "srsearch": author,
            "srlimit": str(limit),
            # Yalnızca ana ad alanı: tartışma/yazar/şablon sayfaları değil.
            "srnamespace": "0",
            "format": "json",
        },
    )
    response.raise_for_status()
    return [item["title"] for item in response.json().get("query", {}).get("search", [])]


def fetch_plain_text(client: httpx.Client, lang: str, title: str) -> str | None:
    response = client.get(
        api_url(lang),
        params={
            "action": "query",
            "prop": "extracts",
            "explaintext": "1",
            "titles": title,
            "format": "json",
        },
    )
    response.raise_for_status()
    pages = response.json().get("query", {}).get("pages", {})
    for page in pages.values():
        if "extract" in page:
            return page["extract"]
    return None


def clean(text: str) -> str:
    """Wikisource artıklarını ayıklar."""
    # Bölüm başlıkları (== Başlık ==) düz metne çevrildiğinde yalnız satır
    # olarak kalıyor; dursunlar ama süslemeleri gitsin.
    text = re.sub(r"={2,}", "", text)
    # Dipnot işaretleri ve şablon kalıntıları.
    text = re.sub(r"\[\d+\]", "", text)
    # Üç ve daha fazla boş satır -> paragraf sınırı.
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def slugify(title: str, fallback: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return (slug[:80] or f"ws-{fallback}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True, choices=sorted(CURATED_AUTHORS))
    parser.add_argument("--count", type=int, default=30)
    args = parser.parse_args()

    out_dir = PIPELINE_ROOT / f"classics_{args.lang}"
    out_dir.mkdir(exist_ok=True)

    downloaded = 0
    seen: set[str] = set()

    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=60.0) as client:
        for author, death_year in CURATED_AUTHORS[args.lang]:
            if downloaded >= args.count:
                break

            print(f"\n[{args.lang}] {author} (ö. {death_year}) aranıyor...")
            try:
                titles = search_pages(client, args.lang, author, limit=40)
            except httpx.HTTPError as error:
                print(f"  ATLA: arama başarısız ({error})")
                continue
            print(f"  {len(titles)} sayfa bulundu.")

            for index, title in enumerate(titles):
                if downloaded >= args.count:
                    break
                if title in seen:
                    continue
                seen.add(title)

                slug = slugify(title, f"{args.lang}-{index}")
                txt_path = out_dir / f"{slug}.txt"
                if txt_path.exists():
                    continue

                try:
                    extract = fetch_plain_text(client, args.lang, title)
                except httpx.HTTPError as error:
                    print(f"    ATLA {title}: {error}")
                    continue

                if not extract:
                    continue
                body = clean(extract)
                if not (MIN_CHARS <= len(body) <= MAX_CHARS):
                    continue

                txt_path.write_text(body, encoding="utf-8")
                (out_dir / f"{slug}.json").write_text(
                    json.dumps(
                        {
                            "title": title,
                            "author": author,
                            "author_death_year": death_year,
                            "source_url": f"https://{args.lang}.wikisource.org/wiki/{title.replace(' ', '_')}",
                            "license": "Public Domain (Wikisource, yazar ölüm + 70 doldu)",
                        },
                        ensure_ascii=False,
                        indent=2,
                    ),
                    encoding="utf-8",
                )
                downloaded += 1
                print(f"    alındı: {title} ({len(body)} karakter)")
                # Wikimedia API'sine saygılı hız.
                time.sleep(0.4)

    print(f"\n{downloaded} eser indirildi -> {out_dir}")


if __name__ == "__main__":
    main()
