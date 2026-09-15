"""Wikisource'tan kamu malı metin indirir (Türkçe ve Arapça için).

NEDEN BU KAYNAK: Project Gutenberg'de Türkçe ve Arapça eser SAYISI SIFIR
(Gutendex ölçümü, 2026-09-15). Hindawi'nin Arapça arşivi programatik
erişime kapalı (403). Wikisource ise her iki dilde de gerçek edebiyat
taşıyor ve açık bir API'si var.

NEDEN ARAMA DEĞİL KATEGORİ (düzeltme, 2026-09-15): önce yazar adıyla
arama yapılıyordu ve sonuçlar felaketti -- "Ömer Seyfettin" araması
Devlet Bahçeli'nin 2011 tarihli bir konuşmasını getirdi. Arama, yazarın
adının GEÇTİĞİ her sayfayı döndürüyor; o sayfanın telif durumu ya da
yazarıyla hiçbir ilgisi olmayabilir. Telifli bir 2011 metnini kamu malı
klasik diye yayınlamak gerçek bir ihlal olurdu.

Artık Wikisource'un KENDİ kamu malı kategorisi kullanılıyor
(tr: "Türkiye'de yayımı serbest eserler" -- 498 sayfa, ölçüldü). Bu
kategori topluluk tarafından sürdürülüyor ve doğrudan "bu eserin yayımı
serbest" diyor. Küratörlü yazar listesi İKİNCİ bir süzgeç olarak duruyor:
sayfa, listedeki yazarlardan birine ait değilse alınmıyor. İki bağımsız
kontrol, tek bir kaynağın hatasına karşı koruma.

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

#: Sayfanın YAZAR ALANI. Wikisource şablonlarında yazar açık bir alanda
#: duruyor (tr: "eser sahibi", ar: "مؤلف"). Ham metinde adın GEÇMESİ
#: yetmez -- siyasi konuşmalar Ömer Seyfettin'den alıntı yaptığı için
#: metin araması onları da yazarın eseri sanıyordu (gerçekten oldu).
AUTHOR_FIELD = {
    "tr": r"eser\s*sahibi\s*=\s*(.+)",
    "ar": r"(?:مؤلف|المؤلف)\s*=\s*(.+)",
}

#: Wikisource'un kendi kamu malı kategorisi (dil başına).
PUBLIC_DOMAIN_CATEGORY = {
    "tr": "Kategori:Türkiye'de yayımı serbest eserler",
    "ar": "تصنيف:ملكية عامة",
}

MIN_CHARS = 2500
MAX_CHARS = 120_000


def api_url(lang: str) -> str:
    return f"https://{lang}.wikisource.org/w/api.php"


def category_pages(client: httpx.Client, lang: str, category: str) -> list[str]:
    """Kamu malı kategorisindeki sayfalar (sayfalama ile tamamı)."""
    titles: list[str] = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": category,
        "cmlimit": "500",
        "cmnamespace": "0",
        "format": "json",
    }
    while True:
        response = client.get(api_url(lang), params=params)
        response.raise_for_status()
        payload = response.json()
        titles.extend(
            item["title"] for item in payload.get("query", {}).get("categorymembers", [])
        )
        cont = payload.get("continue", {}).get("cmcontinue")
        if not cont:
            break
        params = {**params, "cmcontinue": cont}
    return titles


def page_author(client: httpx.Client, lang: str, title: str) -> str | None:
    """Sayfanın ham wikitext'inden yazar alanını okur.

    Wikisource şablonları dilden dile farklı ama yazar adı neredeyse her
    zaman ham metinde geçiyor. Küratörlü listedeki adlardan biri metinde
    yoksa sayfa o yazara ait değildir ve alınmaz -- kategori doğru olsa
    bile, hangi yazarın eseri olduğunu bilmeden telif gerekçesi
    kuramayız.
    """
    response = client.get(
        api_url(lang),
        params={
            "action": "query",
            "prop": "revisions",
            "rvprop": "content",
            "rvslots": "main",
            "titles": title,
            "format": "json",
        },
    )
    response.raise_for_status()
    for page in response.json().get("query", {}).get("pages", {}).values():
        revisions = page.get("revisions") or []
        if not revisions:
            continue
        content = revisions[0].get("slots", {}).get("main", {}).get("*", "")
        return content[:2000]
    return None


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

    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=60.0) as client:
        category = PUBLIC_DOMAIN_CATEGORY[args.lang]
        print(f"[{args.lang}] kamu malı kategorisi taranıyor: {category}")
        try:
            titles = category_pages(client, args.lang, category)
        except httpx.HTTPError as error:
            print(f"  DURDU: kategori okunamadı ({error})")
            return
        print(f"  {len(titles)} sayfa.")

        authors = CURATED_AUTHORS[args.lang]

        for index, title in enumerate(titles):
            if downloaded >= args.count:
                break

            slug = slugify(title, f"{args.lang}-{index}")
            txt_path = out_dir / f"{slug}.txt"
            if txt_path.exists():
                continue

            try:
                wikitext = page_author(client, args.lang, title) or ""
            except httpx.HTTPError:
                continue

            # İKİNCİ SÜZGEÇ: sayfanın YAZAR ALANI küratörlü listede olmalı.
            #
            # Ham metinde adın geçmesi YETMEZ: "Türkiye'de yayımı serbest
            # eserler" kategorisinde siyasi konuşmalar da var (Türk
            # hukukunda onların yayımı serbest) ve o konuşmalar Ömer
            # Seyfettin'den alıntı yapıyor. Metin araması onları yazarın
            # eseri sanıp indirmişti -- gerçekten oldu, bu yüzden alan
            # eşleşmesi şart.
            field_match = re.search(AUTHOR_FIELD[args.lang], wikitext)
            page_author_name = (field_match.group(1).strip() if field_match else "")
            matched = next((a for a in authors if a[0] in page_author_name), None)
            if not matched:
                continue
            author, death_year = matched

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
                        "license": "Public Domain (Wikisource kamu malı kategorisi + yazar ölüm + 70)",
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            downloaded += 1
            print(f"    alındı: {title} / {author} ({len(body)} karakter)")
            time.sleep(0.4)

    print(f"\n{downloaded} eser indirildi -> {out_dir}")


if __name__ == "__main__":
    main()
